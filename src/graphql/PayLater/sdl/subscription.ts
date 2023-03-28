import { PayLaterAccount, PayLaterTransaction } from '@prisma/client';
import { arg, extendType, nonNull } from 'nexus';

interface IPayloadPayLaterTransaction {
  mutationType: 'ADD' | 'EDIT' | 'DELETE';
  transaction: PayLaterTransaction;
}

interface IPayloadUpdatedPayLaterAccount {
  payLaterAccountUpdate: PayLaterAccount;
}

export const PayLaterTransactionSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('payLaterTransactionLive', {
      type: 'PayLaterTransactionSubscriptionType',
      description: 'Subscription for pay later transaction',
      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The payLaterAccountId associated with that pay later account',
          })
        ),
      },

      subscribe: async (__, { payLaterAccountId }, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(
          `payLaterTransactionLive_${payLaterAccountId}`
        );
      },

      resolve: async (
        payload: IPayloadPayLaterTransaction,
        ___,
        { prisma },
        __
      ) => {
        const { transaction, mutationType } = payload;

        const merchant = await prisma.merchant.findFirstOrThrow({
          where: { id: transaction.merchantId },
        });

        const obj = {
          id: transaction.id,
          transactionName: transaction.transactionName,
          payLaterAccountId: transaction.payLaterAccountId,
          dateTimestamp: transaction.dateTimestamp,
          currency: transaction.currency,
          amount: transaction.amount,
          merchant: merchant,
          merchantId: transaction.merchantId,
          category: transaction.category as
            | { amount: string; name: string }[]
            | null
            | undefined,
          direction: transaction.direction,
          transactionType: transaction.transactionType,
          internalTransferTransactionId:
            transaction.internalTransferTransactionId,
          notes: transaction.notes,
          location: transaction.location,
          tags: transaction.tags as
            | { amount: string; name: string }[]
            | null
            | undefined,
          isHideFromBudget: transaction.isHideFromBudget,
          isHideFromInsight: transaction.isHideFromInsight,
          description: transaction.description,
          institutionId: transaction.institutionId,
          referenceId: transaction.referenceId,
          onlineTransaction: transaction.onlineTransaction,
          isReviewed: transaction.isReviewed,
          isSubscription: transaction.isSubscription,
        };

        return { mutationType, transaction: obj };
      },
    });
  },
});

export const PayLaterAccountSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('updatedPayLaterAccountLive', {
      type: 'PayLaterAccount',
      description: 'Subscription for pay later account',
      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The payLaterAccountId associated with that pay later account',
          })
        ),
      },

      subscribe: async (__, { payLaterAccountId }, { pubsub }, ___) => {
        return pubsub.asyncIterator(
          `payLaterAccountUpdated_${payLaterAccountId}`
        );
      },

      resolve: async (
        payload: IPayloadUpdatedPayLaterAccount,
        __,
        ____,
        ___
      ) => {
        const { payLaterAccountUpdate } = payload;

        return {
          id: payLaterAccountUpdate.id,
          userId: payLaterAccountUpdate.userId,
          createdAt: payLaterAccountUpdate.createdAt,
          lastUpdate: payLaterAccountUpdate.lastUpdate,
          balance: payLaterAccountUpdate.balance,
          currency: payLaterAccountUpdate.currency,
          institutionId: payLaterAccountUpdate.institutionId,
          accountNumber: payLaterAccountUpdate.accountNumber,
          expired: payLaterAccountUpdate.expired,
        };
      },
    });
  },
});
