import { arg, extendType, nonNull } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { findBrickTransactionIndex } from '../../../utils/transaction';
import {
  brickUrl,
  getClientIdandRedirectRefId,
  brickPublicAccessToken,
  mapBrickInstitutionIdToKudoku,
  getAccountDetail,
} from '../../../utils/brick';
import axios from 'axios';
import moment from 'moment';
import {
  DebitTransaction,
  DirectionType,
  TransactionType,
} from '@prisma/client';
import _ from 'lodash';

export const DebitAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('connectBcaViaBrick', {
      type: 'DebitAccount',
      description: 'Connect debit card account via BRICK.',
      args: {
        brickInstitutionId: nonNull(
          arg({
            type: 'Int',
            description: 'The BRICK institution Id.',
          })
        ),
        username: nonNull(
          arg({
            type: 'String',
            description: 'The username for the particular bank details',
          })
        ),
        password: nonNull(
          arg({
            type: 'String',
            description: 'The password for the particular bank details',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { brickInstitutionId, username, password } = args;
        const { userId, prisma } = context;

        if (
          brickInstitutionId !== 2 &&
          brickInstitutionId !== 37 &&
          brickInstitutionId !== 38
        )
          throw new Error('Invalid brick institution id for BCA');

        if (!userId) throw new Error('Invalid token');

        const searchUser = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!searchUser) {
          throw new Error('User does not exist');
        }

        const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
          userId
        ).catch((e) => {
          console.error(e);
          throw new Error(e);
        });

        const url = brickUrl(`/v1/auth/${clientId}`);

        const options = {
          method: 'POST',
          url: url.href,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${brickPublicAccessToken}`,
          },
          data: {
            institutionId: brickInstitutionId,
            username,
            password,
            redirectRefId,
          },
        };

        const {
          data: { data },
        }: { data: { data: BrickTokenData } } = await axios
          .request(options)
          .catch((e) => {
            console.error(e);
            throw new Error(e);
          });

        const accountDetail = await getAccountDetail(data.accessToken).catch(
          (e) => {
            console.error(e);
            throw new Error(e);
          }
        );

        /*
        Avoid same debit account duplication
        */
        const searchDebitAccount = await prisma.debitAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[0].accountNumber },
              { userId },
            ],
          },
        });

        if (searchDebitAccount)
          throw new Error('The same account has already been created');

        const debitAccount = await prisma.debitAccount.create({
          data: {
            userId: searchUser.id,
            institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
            accountNumber: accountDetail[0].accountNumber,
            accessToken: data.accessToken,
            balance: accountDetail[0].balances.available.toString(),
            createdAt: new Date(),
            lastUpdate: new Date(),
            currency: accountDetail[0].currency,
          },
        });

        /* 
        Pull the initial transaction for the month
        */

        const transactionUrl = brickUrl(`/v1/transaction/list`);

        const from = moment()
          .startOf('M')
          .subtract(1, 'day')
          .format('YYYY-MM-DD');

        const to = moment().add(1, 'day').format('YYYY-MM-DD');

        const transactionOptions = {
          method: 'GET',
          url: transactionUrl.href,
          params: { from, to },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.accessToken}`,
          },
        };

        const {
          data: { data: transactionData },
        }: { data: { data: BrickTransactionData[] } } = await axios
          .request(transactionOptions)
          .catch((e) => {
            console.error(e);
            throw new Error(e);
          });

        for (let i = 0; i < transactionData.length; i++) {
          const element = transactionData[i];

          const obj = {
            debitAccountId: debitAccount.id,
            dateTimestamp: new Date(
              moment(element.dateTimestamp).add(1, 'day') as unknown as Date
            ),
            referenceId: element.reference_id,
            currency: element.account_currency,
            amount: element.amount.toString(),
            onlineTransaction: false,
            isReviewed: false,
            merchantId: '63d8b775d3e050940af0caf1',
            category: [
              { name: 'UNDEFINED', amount: element.amount.toString() },
            ],
            transactionType: (element.direction === 'in'
              ? 'INCOME'
              : 'EXPENSE') as TransactionType,
            direction: (element.direction === 'in'
              ? 'IN'
              : 'OUT') as DirectionType,
            isSubscription: false,
            description: element.description,
            institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
            tags: [],
            isHideFromBudget: false,
            isHideFromInsight: false,
            transactionMethod: 'UNDEFINED',
          };

          await prisma.debitTransaction.create({ data: obj });
        }

        return {
          id: debitAccount.id,
          userId: debitAccount.userId,
          institutionId: debitAccount.institutionId,
          accountNumber: debitAccount.accountNumber,
          accessToken: debitAccount.accessToken,
          balance: debitAccount.balance,
          createdAt: toTimeStamp(debitAccount.createdAt),
          lastUpdate: toTimeStamp(debitAccount.lastUpdate),
          currency: debitAccount.currency,
        };
      },
    });
  },
});

export const DebitTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.list.field('refreshBcaTransactionViaBrick', {
      type: 'DebitTransaction',
      description:
        'Update transaction and balance for a particular debit account',
      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that debit account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { debitAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const debitAccount = await prisma.debitAccount.findFirst({
          where: { id: debitAccountId },
        });

        if (!debitAccount) throw new Error('Cannot find the debit account');

        const debitTransaction = await prisma.debitTransaction.findMany({
          where: { debitAccountId: debitAccount.id },
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        const { dateTimestamp, referenceId } = debitTransaction[0];

        const from = moment(dateTimestamp)
          .subtract(1, 'day')
          .format('YYYY-MM-DD');
        const to = moment().add(1, 'day').format('YYYY-MM-DD');

        const transactionUrl = brickUrl(`/v1/transaction/list`);

        const transactionOptions = {
          method: 'GET',
          url: transactionUrl.href,
          params: { from, to },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${debitAccount.accessToken}`,
          },
        };

        const {
          data: { data },
        }: { data: { data: BrickTransactionData[] } } = await axios
          .request(transactionOptions)
          .catch((e) => {
            throw new Error(e);
          });

        const transactionData = _.sortBy(data, [
          'dateTimestamp',
          'reference_id',
        ]);

        const index = findBrickTransactionIndex(referenceId, transactionData);

        const newTransaction = transactionData.splice(
          index + 1,
          transactionData.length
        );

        if (newTransaction.length === 0)
          throw new Error('There is no new transaction');

        let responseToIterate: DebitTransaction[] = [];

        for (let i = 0; i < newTransaction.length; i++) {
          const element = newTransaction[i];

          const trans = await prisma.debitTransaction.create({
            data: {
              debitAccountId: debitAccount.id,
              dateTimestamp: new Date(
                moment(element.dateTimestamp).add(1, 'day') as unknown as Date
              ),
              referenceId: element.reference_id,
              currency: element.account_currency,
              amount: element.amount.toString(),
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [
                { name: 'UNDEFINED', amount: element.amount.toString() },
              ],
              transactionType: (element.direction === 'in'
                ? 'INCOME'
                : 'EXPENSE') as TransactionType,
              direction: (element.direction === 'in'
                ? 'IN'
                : 'OUT') as DirectionType,
              isSubscription: false,
              description: element.description,
              institutionId: debitAccount.institutionId,
              tags: [],
              isHideFromBudget: false,
              isHideFromInsight: false,
              transactionMethod: 'UNDEFINED',
            },
          });

          responseToIterate.push(trans);
        }

        /*
        Update balance after pulling new transaction
        */
        const accountDetail = await getAccountDetail(
          debitAccount.accessToken
        ).catch((e) => {
          throw new Error(e);
        });

        await prisma.debitAccount.update({
          where: { id: debitAccountId },
          data: {
            balance: accountDetail[0].balances.current.toString(),
            lastUpdate: new Date(),
          },
        });

        /*
        Create data on the 'Refresh' collection
        */
        await prisma.refresh.create({
          data: {
            userId: user.id,
            date: new Date(),
          },
        });

        /*
        Iterating to comply with graphql type
        */

        if (responseToIterate.length === 0) {
          return null;
        } else {
          let response: any[] = [];
          for (let i = 0; i < responseToIterate.length; i++) {
            const element = responseToIterate[i];

            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId ?? '63d3be20009767d5eb7e7410' },
            });

            const obj = {
              id: element.id,
              debitAccountId: element.debitAccountId,
              dateTimestamp: toTimeStamp(element.dateTimestamp),
              referenceId: element.referenceId,
              institutionId: element.institutionId,
              currency: element.currency,
              amount: element.amount,
              onlineTransaction: element.onlineTransaction,
              isReviewed: element.isReviewed,
              merchant: merchant ?? null,
              merchantId: element.merchantId,
              category: element.category,
              transactionType: element.transactionType,
              description: element.description,
              internalTransferAccountId: element.internalTransferAccountId,
              direction: element.direction,
              notes: element.notes,
              location: element.location,
              tags: element.tags,
              isSubscription: element.isSubscription,
              isHideFromBudget: element.isHideFromBudget,
              isHideFromInsight: element.isHideFromInsight,
              transactionMethod: element.transactionMethod,
            };

            response.push(obj);
          }

          return response;
        }
      },
    });
  },
});
