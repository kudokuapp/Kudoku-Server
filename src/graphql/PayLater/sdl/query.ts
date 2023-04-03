import { decodePayLaterAccountId } from '../../../utils/auth';
import { arg, extendType, nonNull } from 'nexus';

export const PayLaterAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllPayLaterAccount', {
      type: 'PayLaterAccount',
      description: 'Get all pay later account for a particular user.',

      async resolve(__, ___, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccount = await prisma.payLaterAccount.findMany({
            where: { userId: user.id },
          });

          let response: any[] = [];

          for (let i = 0; i < payLaterAccount.length; i++) {
            const element = payLaterAccount[i];

            const obj = {
              id: element.id,
              userId: element.userId,
              createdAt: element.createdAt,
              lastUpdate: element.lastUpdate,
              balance: element.balance,
              limit: element.limit,
              currency: element.currency,
              institutionId: element.institutionId,
              accountNumber: element.accountNumber,
              expired: element.expired,
              brickAccessToken: element.accessToken,
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getInfoPayLaterAccount', {
      type: 'PayLaterAccount',

      description: 'Get info on a particular pay later account',

      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The pay later account id',
          })
        ),
      },

      resolve: async (__, { payLaterAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccount = await prisma.payLaterAccount.findFirstOrThrow(
            {
              where: { AND: [{ id: payLaterAccountId }, { userId: user.id }] },
            }
          );

          const allPayLaterTransaction =
            await prisma.payLaterTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
            });

          const latestTransaction = allPayLaterTransaction.find((element) => {
            const decodedPayLaterAccountId = decodePayLaterAccountId(
              element.payLaterAccountId
            );
            return decodedPayLaterAccountId === payLaterAccount.id;
          });

          return {
            id: payLaterAccount.id,
            userId: user.id,
            institutionId: payLaterAccount.institutionId,
            accountNumber: payLaterAccount.accountNumber,
            createdAt: payLaterAccount.createdAt,
            lastUpdate: latestTransaction
              ? latestTransaction.dateTimestamp
              : payLaterAccount.lastUpdate,
            balance: payLaterAccount.balance,
            currency: payLaterAccount.currency,
            expired: payLaterAccount.expired,
            limit: payLaterAccount.limit,
            brickAccessToken: payLaterAccount.accessToken,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const PayLaterTransactionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllPayLaterTransaction', {
      type: 'PayLaterTransaction',
      description:
        'Get all the pay later transaction from their payLaterAccountId',
      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with pay later account id',
          })
        ),
      },

      async resolve(__, { payLaterAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccount = await prisma.payLaterAccount.findFirstOrThrow(
            {
              where: { AND: [{ id: payLaterAccountId, userId: user.id }] },
            }
          );

          const allTransactions = await prisma.payLaterTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
          });

          let responseArray: any[] = [];

          for (let i = 0; i < allTransactions.length; i++) {
            const element = allTransactions[i];

            const decodedPayLaterAccountId = decodePayLaterAccountId(
              element.payLaterAccountId
            );

            if (decodedPayLaterAccountId === payLaterAccount.id) {
              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                transactionName: element.transactionName,
                payLaterAccountId: decodePayLaterAccountId(
                  element.payLaterAccountId
                ),
                dateTimestamp: element.dateTimestamp,
                currency: element.currency,
                amount: element.amount,
                merchant: merchant,
                merchantId: element.merchantId,
                category: element.category,
                direction: element.direction,
                transactionType: element.transactionType,
                internalTransferTransactionId:
                  element.internalTransferTransactionId,
                notes: element.notes,
                location: element.location,
                tags: element.tags,
                isHideFromBudget: element.isHideFromBudget,
                isHideFromInsight: element.isHideFromInsight,
                description: element.description,
                institutionId: element.institutionId,
                referenceId: element.referenceId,
                onlineTransaction: element.onlineTransaction,
                isReviewed: element.isReviewed,
                isSubscription: element.isSubscription,
              };

              responseArray.push(obj);
            }
          }

          return responseArray;
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getPayLaterLatestTransaction', {
      type: 'PayLaterTransaction',

      description: 'Get the latest pay later transaction',

      args: {
        payLaterAccountId: nonNull(
          arg({ type: 'String', description: 'The payLaterAccountId' })
        ),
      },

      resolve: async (__, { payLaterAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccount = await prisma.payLaterAccount.findFirstOrThrow(
            {
              where: { id: payLaterAccountId, userId: user.id },
            }
          );

          const allPayLaterTransaction =
            await prisma.payLaterTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc', referenceId: 'desc' }],
            });

          const payLaterTransaction = allPayLaterTransaction.filter((v) => {
            const decodedPayLaterAccountId = decodePayLaterAccountId(
              v.payLaterAccountId
            );

            return payLaterAccount.id === decodedPayLaterAccountId;
          });

          if (payLaterTransaction.length === 0)
            throw new Error(
              'There is no transaction in this pay later account.'
            );

          const latestTransaction = payLaterTransaction[0];

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: latestTransaction.merchantId },
          });

          return {
            id: latestTransaction.id,
            transactionName: latestTransaction.transactionName,
            payLaterAccountId: decodePayLaterAccountId(
              latestTransaction.payLaterAccountId
            ),
            dateTimestamp: latestTransaction.dateTimestamp,
            currency: latestTransaction.currency,
            amount: latestTransaction.amount,
            merchant: merchant,
            merchantId: latestTransaction.merchantId,
            category: latestTransaction.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            direction: latestTransaction.direction,
            transactionType: latestTransaction.transactionType,
            internalTransferTransactionId:
              latestTransaction.internalTransferTransactionId,
            notes: latestTransaction.notes,
            location: latestTransaction.location,
            tags: latestTransaction.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isHideFromBudget: latestTransaction.isHideFromBudget,
            isHideFromInsight: latestTransaction.isHideFromInsight,
            description: latestTransaction.description,
            institutionId: latestTransaction.institutionId,
            referenceId: latestTransaction.referenceId,
            onlineTransaction: latestTransaction.onlineTransaction,
            isReviewed: latestTransaction.isReviewed,
            isSubscription: latestTransaction.isSubscription,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
