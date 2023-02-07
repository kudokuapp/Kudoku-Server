import { arg, enumType, extendType, list, nonNull } from 'nexus';
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
  Merchant,
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
              { userId: searchUser.id },
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
            merchantId:
              element.direction === 'out' ? '63d8b775d3e050940af0caf1' : null,
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

    t.field('deleteDebitAccount', {
      type: 'ResponseMessage',
      description: 'Delete debit account',

      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The debit account id',
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
          where: { AND: [{ id: debitAccountId }, { userId }] },
        });

        if (!debitAccount) throw new Error('Cannot find that cash account');

        await prisma.debitAccount.delete({ where: { id: debitAccount.id } });

        const deletedTransaction = await prisma.debitTransaction.deleteMany({
          where: { debitAccountId: debitAccount.id },
        });

        return {
          response: `Successfully delete debit account with id ${debitAccountId} and all ${deletedTransaction.count} transaction`,
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
          where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
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
              merchantId:
                element.direction === 'out' ? '63d8b775d3e050940af0caf1' : null,
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

            let merchant: Merchant | null = null;

            if (element.merchantId) {
              merchant = await prisma.merchant.findFirst({
                where: { id: element.merchantId ?? '63d3be20009767d5eb7e7410' },
              });
            }

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
              merchant: merchant,
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

    t.nonNull.field('editBcaTransaction', {
      type: 'DebitTransaction',
      description: 'Edit a particular debit (BCA) transaction',
      args: {
        transactionId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that transaction',
          })
        ),

        onlineTransaction: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is online',
        }),

        merchantId: arg({
          type: 'String',
          description: 'The merchant id',
        }),

        category: arg({
          type: list('CategoryInputType'),
          description: 'The category of the transaction',
        }),

        transactionType: arg({
          type: 'ExpenseTypeEnum',
          description:
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
        }),

        internalTransferAccountId: arg({
          type: 'String',
          description: 'The account id for internal transfer',
        }),

        isSubscription: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is a subscription',
        }),

        notes: arg({
          type: 'String',
          description: 'Notes for this transaction',
        }),

        location: arg({
          type: 'LocationInputType',
          description: 'The location for this transaction',
        }),

        tags: arg({
          type: nonNull(list(nonNull('String'))),
          description: 'The tags for this transaction',
        }),

        isHideFromBudget: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from budget. default: false',
          default: false,
        }),

        isHideFromInsight: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from insight. default: false',
          default: false,
        }),

        transactionMethod: arg({
          type: TransactionMethodEnum,
          description: 'What transaction method is this.',
        }),
      },

      async resolve(parent, args, context, info) {
        const {
          transactionId,
          onlineTransaction,
          merchantId,
          category,
          transactionType,
          internalTransferAccountId,
          isSubscription,
          notes,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
          transactionMethod,
        } = args;

        if (
          !onlineTransaction &&
          !merchantId &&
          !category &&
          !transactionType &&
          !internalTransferAccountId &&
          !isSubscription &&
          !notes &&
          !location &&
          !tags &&
          !isHideFromBudget &&
          !isHideFromInsight &&
          !transactionMethod
        )
          throw new Error('Cannot have all value as null');

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const transaction = await prisma.debitTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction) throw new Error('Cannot find transaction');

        const { amount } = transaction;

        if (transactionType === 'TRANSFER' && !internalTransferAccountId)
          throw new Error(
            'Please insert internalTransferAccountId if this is a `TRANSFER` type'
          );

        if (
          (transactionType === 'EXPENSE' ||
            transaction.transactionType === 'EXPENSE') &&
          !merchantId
        )
          throw new Error(
            'Please insert merchant id if the transaction type is not income'
          );

        if (category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (!element) throw new Error('Object is null');

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw new Error(
              'The amount sum of categories need to be the same with the amount given'
            );
        }

        const response = await prisma.debitTransaction.update({
          where: { id: transaction.id },
          data: {
            onlineTransaction:
              onlineTransaction ?? transaction.onlineTransaction,
            merchantId: merchantId ?? transaction.merchantId,
            category: category ?? transaction.category,
            transactionType: transactionType ?? transaction.transactionType,
            internalTransferAccountId:
              internalTransferAccountId ??
              transaction.internalTransferAccountId,
            isSubscription: isSubscription ?? transaction.isSubscription,
            notes: notes ?? transaction.notes,
            location: location ?? transaction.location,
            tags: tags ?? transaction.tags,
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
            transactionMethod:
              transactionMethod ?? transaction.transactionMethod,
            isReviewed: true,
          },
        });

        let merchant: Merchant | null = null;

        if (response.merchantId) {
          merchant = await prisma.merchant.findFirst({
            where: { id: response.merchantId },
          });
        }

        return {
          id: response.id,
          debitAccountId: response.debitAccountId,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          referenceId: response.referenceId,
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          onlineTransaction: response.onlineTransaction,
          isReviewed: response.isReviewed,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as
            | ({ amount: string; name: string } | null)[]
            | null
            | undefined,
          transactionType: response.transactionType,
          description: response.description,
          internalTransferAccountId: response.internalTransferAccountId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags,
          isSubscription: response.isSubscription,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
          transactionMethod: response.transactionMethod,
        };
      },
    });
  },
});


