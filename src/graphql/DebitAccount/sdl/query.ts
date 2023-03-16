import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';
import { decodeDebitAccountId } from '../../../utils/auth';

export const DebitAccountQuery = extendType({
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

      async resolve(parent, args, context, info) {
        const { debitAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const debitAccount = await prisma.debitAccount.findFirst({
          where: { id: debitAccountId },
        });

        if (!debitAccount)
          throw { status: 4000, message: 'Akun debit tidak ditemukan.' };

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

            if (!merchant)
              throw { status: 2400, message: 'Merchant tidak ditemukan.' };

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              debitAccountId: decodeDebitAccountId(
                element.debitAccountId
              ) as unknown as string,
              dateTimestamp: toTimeStamp(element.dateTimestamp),
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
      },
    });

    t.list.field('getAllDebitAccount', {
      type: 'DebitAccount',
      description: 'Get all debit account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const debitAccount = await prisma.debitAccount.findMany({
          where: { userId },
        });

        if (!debitAccount)
          throw { status: 4000, message: 'Akun debit tidak ditemukan.' };

        let response: any[] = [];

        for (let i = 0; i < debitAccount.length; i++) {
          const element = debitAccount[i];

          const obj = {
            id: element.id,
            userId: element.userId,
            createdAt: toTimeStamp(element.createdAt),
            lastUpdate: toTimeStamp(element.lastUpdate),
            balance: element.balance,
            currency: element.currency,
            institutionId: element.institutionId,
            accountNumber: element.accountNumber,
          };

          response.push(obj);
        }

        return response;
      },
    });
  },
});
