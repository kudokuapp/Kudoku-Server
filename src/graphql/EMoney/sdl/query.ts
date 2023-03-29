import { arg, extendType, nonNull } from 'nexus';
import { decodeEMoneyAccountId } from '../../../utils/auth/eMoneyAccountId';

export const EMoneyAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllEMoneyAccount', {
      type: 'EMoneyAccount',
      description: 'Get all e-money account for a particular user.',

      async resolve(__, ____, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eMoneyAccount = await prisma.eMoneyAccount.findMany({
            where: { userId: user.id },
          });

          let response: any[] = [];

          for (let i = 0; i < eMoneyAccount.length; i++) {
            const element = eMoneyAccount[i];

            const obj = {
              id: element.id,
              userId: element.userId,
              createdAt: element.createdAt,
              lastUpdate: element.lastUpdate,
              balance: element.balance,
              currency: element.currency,
              institutionId: element.institutionId,
              cardNumber: element.cardNumber,
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getInfoEMoneyAccount', {
      type: 'EMoneyAccount',

      description: 'Get info on a particular e-money account',

      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The e-money account id',
          })
        ),
      },

      resolve: async (__, { eMoneyAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          const allEMoneyTransaction = await prisma.eMoneyTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }],
          });

          const latestTransaction = allEMoneyTransaction.find((element) => {
            const decodedEMoneyAccountId = decodeEMoneyAccountId(
              element.eMoneyAccountId
            );
            return decodedEMoneyAccountId === eMoneyAccount.id;
          });

          return {
            id: eMoneyAccount.id,
            userId: user.id,
            institutionId: eMoneyAccount.institutionId,
            cardNumber: eMoneyAccount.cardNumber,
            createdAt: eMoneyAccount.createdAt,
            lastUpdate: latestTransaction
              ? latestTransaction.dateTimestamp
              : eMoneyAccount.lastUpdate,
            balance: eMoneyAccount.balance,
            currency: eMoneyAccount.currency,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const EMoneyTransactionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllEMoneyTransaction', {
      type: 'EMoneyTransaction',
      description: 'Get all the e-money transaction from their eMoneyAccountId',
      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with e-money account id',
          })
        ),
      },

      async resolve(__, { eMoneyAccountId }, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { id: eMoneyAccountId },
          });

          const allTransactions = await prisma.eMoneyTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }],
          });

          let responseArray: any[] = [];

          for (let i = 0; i < allTransactions.length; i++) {
            const element = allTransactions[i];

            const decodedEMoneyAccountId = decodeEMoneyAccountId(
              element.eMoneyAccountId
            );

            if (decodedEMoneyAccountId === eMoneyAccount.id) {
              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                transactionName: element.transactionName,
                eMoneyAccountId: decodeEMoneyAccountId(element.eMoneyAccountId),
                dateTimestamp: element.dateTimestamp,
                currency: element.currency,
                amount: element.amount,
                merchant: merchant,
                merchantId: element.merchantId,
                category: element.category,
                direction: element.direction,
                transactionType: element.transactionType,
                notes: element.notes,
                location: element.location,
                tags: element.tags,
                isHideFromBudget: element.isHideFromBudget,
                isHideFromInsight: element.isHideFromInsight,
                description: element.description,
                institutionId: element.institutionId,
                isReviewed: element.isReviewed,
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
