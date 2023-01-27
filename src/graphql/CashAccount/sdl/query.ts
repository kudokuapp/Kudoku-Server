import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';

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

        if (!userId) throw new Error('Invalid token');

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

        let responseArray = new Array(response.length);

        for (let i = 0; i < response.length; i++) {
          const element = response[i];

          const merchant = await prisma.merchant.findFirst({
            where: { id: element.merchantId },
          });

          const obj = {
            id: element.id,
            cashAccountId: element.cashAccountId,
            dateTimestamp: toTimeStamp(element.dateTimestamp),
            currency: element.currency,
            amount: element.amount,
            merchant,
            merchantId: element.merchantId,
            expenseCategory: element.expenseCategory,
            transactionType: element.transactionType,
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
  },
});
