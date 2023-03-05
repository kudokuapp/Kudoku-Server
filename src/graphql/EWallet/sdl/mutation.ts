import { arg, extendType, nonNull } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { findBrickTransactionIndex } from '../../../utils/transaction';
import {
  accessTokenIsExpired,
  brickPublicAccessToken,
  brickUrl,
  getAccountDetail,
  mapBrickInstitutionIdToKudoku,
} from '../../../utils/brick';
import axios from 'axios';
import moment from 'moment';
import { DirectionType, TransactionType } from '@prisma/client';
import _ from 'lodash';

export const EWalletAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.list.nonNull.field('connectGopayViaBrick', {
      type: 'EWalletAccount',
      description: 'Connect Gopay account via BRICK.',

      args: {
        username: nonNull(
          arg({
            type: 'String',
            description: 'Nomor HP Gopay',
          })
        ),

        redirectRefId: nonNull(
          arg({
            type: 'Int',
            description:
              'redirectRefId after running `sendOtpGopayViaBrick` query',
          })
        ),

        clientId: nonNull(
          arg({
            type: 'Int',
            description: 'clientId after running `sendOtpGopayViaBrick` query',
          })
        ),

        sessionId: nonNull(
          arg({
            type: 'String',
            description: 'sessionId after running `sendOtpGopayViaBrick` query',
          })
        ),

        uniqueId: nonNull(
          arg({
            type: 'String',
            description: 'uniqueId after running `sendOtpGopayViaBrick` query',
          })
        ),

        otpToken: nonNull(
          arg({
            type: 'String',
            description: 'otpToken after running `sendOtpGopayViaBrick` query',
          })
        ),

        otp: nonNull(
          arg({
            type: 'String',
            description: 'otp after running `sendOtpGopayViaBrick` query',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const {
          username,
          otp,
          otpToken,
          uniqueId,
          sessionId,
          clientId,
          redirectRefId,
        } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirstOrThrow({
          where: { id: userId },
        });

        const url = brickUrl(`/v1/auth/gopay/${clientId}`);

        const options = {
          method: 'POST',
          url: url.href,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${brickPublicAccessToken}`,
          },
          data: {
            institutionId: 11,
            username,
            redirectRefId,
            sessionId,
            uniqueId,
            otpToken,
            otp,
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

        /**
         * Wallet = accountDetail[0]
         * Paylater = accountDetail[1]
         */

        /*
        Avoid same account duplication
        */
        const walletAccountSearch = await prisma.eWalletAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[0].accountNumber },
              { userId },
            ],
          },
        });

        const paylaterAccountSearch = await prisma.eWalletAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[1].accountNumber },
              { userId },
            ],
          },
        });

        if (walletAccountSearch || paylaterAccountSearch)
          throw new Error('The same account has already been created');

        const walletAccount = await prisma.eWalletAccount.create({
          data: {
            userId: user.id,
            institutionId: mapBrickInstitutionIdToKudoku(11),
            accountNumber: accountDetail[0].accountNumber,
            accessToken: data.accessToken,
            balance: accountDetail[0].balances.available.toString(),
            createdAt: new Date(),
            lastUpdate: new Date(),
            currency: accountDetail[0].currency,
            expired: false,
          },
        });

        const paylaterAccount = await prisma.payLaterAccount.create({
          data: {
            userId: user.id,
            institutionId: mapBrickInstitutionIdToKudoku(11),
            accountNumber: accountDetail[1].accountNumber,
            accessToken: data.accessToken,
            balance: accountDetail[1].balances.available.toString(),
            createdAt: new Date(),
            lastUpdate: new Date(),
            currency: accountDetail[1].currency,
            expired: false,
          },
        });

        /*
        Pull the initial transaction for the month
        */

        const transactionUrl = brickUrl(`/v1/transaction/list`);

        const from = moment().subtract(7, 'days').format('YYYY-MM-DD');

        const to = moment().format('YYYY-MM-DD');

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

          if (element.transaction_type === 'Wallet') {
            const obj = {
              eWalletAccountId: walletAccount.id,
              transactionName: element.description,
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
              institutionId: mapBrickInstitutionIdToKudoku(11),
              tags: [],
              isHideFromBudget: false,
              isHideFromInsight: false,
            };

            await prisma.eWalletTransaction.create({ data: obj });
          } else {
            const obj = {
              payLaterAccountId: paylaterAccount.id,
              transactionName: element.description,
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
              institutionId: mapBrickInstitutionIdToKudoku(11),
              tags: [],
              isHideFromBudget: false,
              isHideFromInsight: false,
            };

            await prisma.payLaterTransaction.create({ data: obj });
          }
        }

        return [
          {
            id: walletAccount.id,
            userId: walletAccount.userId,
            institutionId: walletAccount.institutionId,
            accountNumber: walletAccount.accountNumber,
            balance: walletAccount.balance,
            createdAt: toTimeStamp(walletAccount.createdAt),
            lastUpdate: toTimeStamp(walletAccount.lastUpdate),
            currency: walletAccount.currency,
          },
          {
            id: paylaterAccount.id,
            userId: paylaterAccount.userId,
            institutionId: paylaterAccount.institutionId,
            accountNumber: paylaterAccount.accountNumber,
            balance: paylaterAccount.balance,
            createdAt: toTimeStamp(paylaterAccount.createdAt),
            lastUpdate: toTimeStamp(paylaterAccount.lastUpdate),
            currency: paylaterAccount.currency,
          },
        ];
      },
    });
  },
});

export const EWalletTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('refreshGopayTransactionViaBrick', {
      type: 'ResponseMessage',
      description: 'Update transaction and balance for gopay account',
      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-wallet account id',
          })
        ),

        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-wallet account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { eWalletAccountId, payLaterAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const eWalletAccount = await prisma.eWalletAccount.findFirstOrThrow({
          where: { id: eWalletAccountId },
        });

        const eWalletTransaction = await prisma.eWalletTransaction.findMany({
          where: { eWalletAccountId: eWalletAccount.id },
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        const payLaterAccount = await prisma.payLaterAccount.findFirstOrThrow({
          where: { id: payLaterAccountId },
        });

        const payLaterTransaction = await prisma.payLaterTransaction.findMany({
          where: { payLaterAccountId: payLaterAccount.id },
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        /**
         * Check if the access token expired or not
         */

        const expired = await accessTokenIsExpired(eWalletAccount.accessToken);

        if (expired) {
          await prisma.eWalletAccount.update({
            where: { id: eWalletAccount.id },
            data: { expired: true },
          });
          await prisma.payLaterAccount.update({
            where: { id: payLaterAccount.id },
            data: { expired: true },
          });
          throw new Error('Access token is expired');
        }

        const {
          dateTimestamp: dateTimestampEWallet,
          referenceId: referenceIdEWallet,
        } = eWalletTransaction[0];

        const {
          dateTimestamp: dateTimestampPayLater,
          referenceId: referenceIdPayLater,
        } = payLaterTransaction[0];

        const dateTimestamp =
          moment(dateTimestampEWallet) > moment(dateTimestampPayLater)
            ? dateTimestampEWallet
            : dateTimestampPayLater;

        const referenceId =
          moment(dateTimestampEWallet) > moment(dateTimestampPayLater)
            ? referenceIdEWallet
            : referenceIdPayLater;

        const from = moment(dateTimestamp)
          .subtract(1, 'day')
          .format('YYYY-MM-DD');

        const to = moment().format('YYYY-MM-DD');

        const transactionUrl = brickUrl(`/v1/transaction/list`);

        const transactionOptions = {
          method: 'GET',
          url: transactionUrl.href,
          params: { from, to },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${eWalletAccount.accessToken}`,
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

        for (let i = 0; i < newTransaction.length; i++) {
          const element = newTransaction[i];

          if (element.transaction_type === 'Wallet') {
            const obj = {
              eWalletAccountId: eWalletAccount.id,
              transactionName: element.description,
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
              institutionId: mapBrickInstitutionIdToKudoku(11),
              tags: [],
              isHideFromBudget: false,
              isHideFromInsight: false,
            };

            await prisma.eWalletTransaction.create({ data: obj });
          } else {
            const obj = {
              payLaterAccountId: payLaterAccount.id,
              transactionName: element.description,
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
              institutionId: mapBrickInstitutionIdToKudoku(11),
              tags: [],
              isHideFromBudget: false,
              isHideFromInsight: false,
            };

            await prisma.payLaterTransaction.create({ data: obj });
          }
        }

        /*
        Update balance after pulling new transaction
        */
        const accountDetail = await getAccountDetail(
          eWalletAccount.accessToken
        ).catch((e) => {
          throw new Error(e);
        });

        await prisma.eWalletAccount.update({
          where: { id: eWalletAccount.id },
          data: {
            balance: accountDetail[0].balances.current.toString(),
            lastUpdate: new Date(),
          },
        });

        await prisma.payLaterAccount.update({
          where: { id: payLaterAccount.id },
          data: {
            balance: accountDetail[1].balances.current.toString(),
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

        return {
          response: `Successfully create ${newTransaction.length} new transaction and update new balance`,
        };
      },
    });
  },
});
