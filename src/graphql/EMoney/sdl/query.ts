import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';
import { decodeEMoneyAccountId } from '../../../utils/auth';

export const EMoneyQuery = extendType({
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

      async resolve(parent, args, context, info) {
        const { eMoneyAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { id: eMoneyAccountId },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

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
            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId },
            });

            if (!merchant)
              throw { status: 2400, message: 'Merchant tidak ditemukan.' };

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              eMoneyAccountId: decodeEMoneyAccountId(element.eMoneyAccountId),
              dateTimestamp: toTimeStamp(element.dateTimestamp),
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
      },
    });

    t.list.field('getAllEMoneyAccount', {
      type: 'EMoneyAccount',
      description: 'Get all e-money account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const eMoneyAccount = await prisma.eMoneyAccount.findMany({
          where: { userId },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

        let response: any[] = [];

        for (let i = 0; i < eMoneyAccount.length; i++) {
          const element = eMoneyAccount[i];

          const obj = {
            id: element.id,
            userId: element.userId,
            createdAt: toTimeStamp(element.createdAt),
            lastUpdate: toTimeStamp(element.lastUpdate),
            balance: element.balance,
            currency: element.currency,
            institutionId: element.institutionId,
            cardNumber: element.cardNumber,
          };

          response.push(obj);
        }

        return response;
      },
    });
  },
});
