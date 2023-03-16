import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';
import { decodeCashAccountId } from '../../../utils/auth';

export const CashAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllCashAccount', {
      type: 'CashAccount',
      description: 'Get all cash account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const cashAccount = await prisma.cashAccount.findMany({
          where: { userId },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        let response: any[] = [];

        for (let i = 0; i < cashAccount.length; i++) {
          const element = cashAccount[i];

          const obj = {
            id: element.id,
            userId: element.userId,
            createdAt: toTimeStamp(element.createdAt),
            lastUpdate: toTimeStamp(element.lastUpdate),
            accountName: element.accountName,
            displayPicture: element.displayPicture,
            balance: element.balance,
            currency: element.currency,
          };

          response.push(obj);
        }

        return response;
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

      async resolve(parent, args, context, info) {
        const { cashAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { id: cashAccountId },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

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
            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId },
            });

            if (!merchant)
              throw { status: 2400, message: 'Merchant tidak ditemukan.' };

            const obj = {
              id: element.id,
              cashAccountId: decodeCashAccountId(element.cashAccountId),
              dateTimestamp: toTimeStamp(element.dateTimestamp),
              currency: element.currency,
              transactionName: element['transactionName'],
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
      },
    });
  },
});
