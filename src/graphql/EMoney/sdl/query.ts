import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';

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
          throw new Error('Invalid token');
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { id: eMoneyAccountId },
        });

        if (!eMoneyAccount) throw new Error('Cannot find e-money account');

        const response = await prisma.eMoneyTransaction.findMany({
          where: { eMoneyAccountId: eMoneyAccount.id },
          orderBy: [{ dateTimestamp: 'desc' }],
        });

        let responseArray: any[] = [];

        for (let i = 0; i < response.length; i++) {
          const element = response[i];

          const merchant = await prisma.merchant.findFirst({
            where: { id: element.merchantId ?? '63d3be20009767d5eb7e7410' },
          });

          const obj = {
            id: element.id,
            transactionName: element.transactionName,
            eMoneyAccountId: element.eMoneyAccountId,
            dateTimestamp: toTimeStamp(element.dateTimestamp),
            currency: element.currency,
            amount: element.amount,
            merchant: merchant ?? null,
            merchantId: element.merchantId ?? null,
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

        return responseArray;
      },
    });

    t.list.field('getAllEMoneyAccount', {
      type: 'EMoneyAccount',
      description: 'Get all e-money account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const eMoneyAccount = await prisma.eMoneyAccount.findMany({
          where: { userId },
        });

        if (!eMoneyAccount)
          throw new Error('User have not created a e-money account');

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
