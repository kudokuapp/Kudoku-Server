import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';

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
          throw new Error('Invalid token');
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const debitAccount = await prisma.debitAccount.findFirst({
          where: { id: debitAccountId },
        });

        if (!debitAccount) throw new Error('Cannot find debit account');

        const response = await prisma.debitTransaction.findMany({
          where: { debitAccountId },
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        let responseArray: any[] = [];

        for (let i = 0; i < response.length; i++) {
          const element = response[i];

          const merchant = await prisma.merchant.findFirst({
            where: { id: element.merchantId ?? '63d3be20009767d5eb7e7410' },
          });

          const obj = {
            id: element.id,
            debitAccountId: element.debitAccountId,
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

        return responseArray;
      },
    });

    t.list.field('getAllDebitAccount', {
      type: 'DebitAccount',
      description: 'Get all debit account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const debitAccount = await prisma.debitAccount.findMany({
          where: { userId },
        });

        if (!debitAccount)
          throw new Error('User have not created a debit account');

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
