import { decodePayLaterAccountId } from '../../../utils/auth/payLaterAccountId';
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
              currency: element.currency,
              institutionId: element.institutionId,
              accountNumber: element.accountNumber,
              expired: element.expired,
            };

            response.push(obj);
          }

          return response;
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
  },
});
