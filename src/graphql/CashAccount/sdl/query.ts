import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';
import { GraphQLError } from 'graphql';

export const CashAccountQuery = extendType({
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

        if (!userId) {
          throw new Error('Invalid token');
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { id: cashAccountId },
        });

        if (!cashAccount) throw new Error('Cannot find cash account');

        const response = await prisma.cashTransaction.findMany({
          where: { cashAccountId },
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
            cashAccountId: element.cashAccountId,
            dateTimestamp: toTimeStamp(element.dateTimestamp),
            currency: element.currency,
            amount: element.amount,
            merchant: merchant ?? null,
            merchantId: element.merchantId ?? null,
            category: element.category,
            direction: element.direction,
            transactionType: element.transactionType,
            internalTransferAccountId: element.internalTransferAccountId,
            notes: element.notes,
            location: element.location,
            tags: element.tags,
            isHideFromBudget: element.isHideFromBudget,
            isHideFromInsight: element.isHideFromInsight,
          };

          responseArray.push(obj);
        }

        return responseArray;
      },
    });

    t.list.field('getAllCashAccount', {
      type: 'CashAccount',
      description: 'Get all cash account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const cashAccount = await prisma.cashAccount.findMany({
          where: { userId },
        });

        if (!cashAccount)
          throw new Error('User have not created a cash account');

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
