import { decodeDebitAccountId } from '../../../utils/auth/debitAccountId';
import { arg, extendType, nonNull } from 'nexus';

export const DebitAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllDebitAccount', {
      type: 'DebitAccount',
      description: 'Get all debit account for a particular user.',

      async resolve(__, ___, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findMany({
            where: { userId: user.id },
          });

          let response: any[] = [];

          for (let i = 0; i < debitAccount.length; i++) {
            const element = debitAccount[i];

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

export const DebitTransactionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllDebitTransaction', {
      type: 'DebitTransaction',
      description: 'Get all the debit transaction from their debitAccountId',
      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with debit account id',
          })
        ),
      },

      async resolve(__, { debitAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findFirstOrThrow({
            where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
          });

          const allTransactions = await prisma.debitTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
          });

          let responseArray: any[] = [];

          for (let i = 0; i < allTransactions.length; i++) {
            const element = allTransactions[i];

            const decodedDebitAccountId = decodeDebitAccountId(
              element.debitAccountId
            ) as unknown as string;

            if (decodedDebitAccountId === debitAccount.id) {
              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                transactionName: element.transactionName,
                debitAccountId: decodeDebitAccountId(
                  element.debitAccountId
                ) as unknown as string,
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
                transactionMethod: element.transactionMethod,
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
