import { CashTransaction } from '@prisma/client';
import { arg, extendType, nonNull } from 'nexus';
import { decodeCashAccountId } from '../../../utils/auth/cashAccountId';

export const CashAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllCashAccount', {
      type: 'CashAccount',
      description: 'Get all cash account for a particular user.',

      async resolve(__, ___, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const cashAccount = await prisma.cashAccount.findMany({
            where: { userId },
          });

          let response: any[] = [];

          for (let i = 0; i < cashAccount.length; i++) {
            const element = cashAccount[i];

            const obj = {
              id: element.id,
              userId: element.userId,
              createdAt: element.createdAt,
              lastUpdate: element.lastUpdate,
              accountName: element.accountName,
              displayPicture: element.displayPicture,
              balance: element.balance,
              currency: element.currency,
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getInfoCashAccount', {
      type: 'CashAccount',

      description: 'Get info on a particular cash account',

      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The cash account id',
          })
        ),
      },

      resolve: async (__, { cashAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
          });

          const allCashTransaction = await prisma.cashTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }],
          });

          const latestTransaction = allCashTransaction.find((element) => {
            const decodedCashAccountId = decodeCashAccountId(
              element.cashAccountId
            );
            return decodedCashAccountId === cashAccount.id;
          });

          return {
            id: cashAccount.id,
            userId: user.id,
            createdAt: cashAccount.createdAt,
            lastUpdate: latestTransaction
              ? latestTransaction.dateTimestamp
              : cashAccount.lastUpdate,
            balance: cashAccount.balance,
            currency: cashAccount.currency,
            accountName: cashAccount.accountName,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const CashTransactionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllCashTransaction', {
      type: 'CashTransaction',
      description: 'Get all the cash transaction from their cashAccountId',
      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with cash account id',
          })
        ),
      },

      async resolve(__, { cashAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { id: cashAccountId },
          });

          const response = await prisma.cashTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }],
          });

          let responseArray: any[] = [];

          for (let i = 0; i < response.length; i++) {
            const element = response[i];

            const decodedCashAccountId = decodeCashAccountId(
              element.cashAccountId
            ) as unknown as string;

            if (decodedCashAccountId === cashAccountId) {
              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                cashAccountId: decodeCashAccountId(element.cashAccountId),
                dateTimestamp: element.dateTimestamp,
                currency: element.currency,
                transactionName: element.transactionName,
                amount: element.amount,
                merchant,
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
