import { decodeDebitAccountId } from '../../../utils/auth';
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

    t.field('getInfoDebitAccount', {
      type: 'DebitAccount',

      description: 'Get info on a particular debit account',

      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The debit account id',
          })
        ),
      },

      resolve: async (__, { debitAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findFirstOrThrow({
            where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
          });

          const allDebitTransaction = await prisma.debitTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
          });

          const latestTransaction = allDebitTransaction.find((element) => {
            const decodedDebitAccountId = decodeDebitAccountId(
              element.debitAccountId
            );
            return decodedDebitAccountId === debitAccount.id;
          });

          return {
            id: debitAccount.id,
            userId: user.id,
            institutionId: debitAccount.institutionId,
            accountNumber: debitAccount.accountNumber,
            createdAt: debitAccount.createdAt,
            lastUpdate: latestTransaction
              ? latestTransaction.dateTimestamp
              : debitAccount.lastUpdate,
            balance: debitAccount.balance,
            currency: debitAccount.currency,
            expired: debitAccount.expired,
            brickAccessToken: debitAccount.accessToken,
          };
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

    t.field('getDebitLatestTransaction', {
      type: 'DebitTransaction',

      description: 'Get the latest debit transaction',

      args: {
        debitAccountId: nonNull(
          arg({ type: 'String', description: 'The debitAccountId' })
        ),
      },

      resolve: async (__, { debitAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findFirstOrThrow({
            where: { id: debitAccountId, userId: user.id },
          });

          const allDebitTransaction = await prisma.debitTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
          });

          const debitTransaction = allDebitTransaction.filter((v) => {
            const decodedDebitAccountId = decodeDebitAccountId(
              v.debitAccountId
            );

            return debitAccount.id === decodedDebitAccountId;
          });

          if (debitTransaction.length === 0)
            throw new Error('There is no transaction in this debit account.');

          const latestTransaction = debitTransaction[0];

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: latestTransaction.merchantId },
          });

          return {
            id: latestTransaction.id,
            transactionName: latestTransaction.transactionName,
            debitAccountId: decodeDebitAccountId(
              latestTransaction.debitAccountId
            ) as unknown as string,
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
            transactionMethod: latestTransaction.transactionMethod,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
