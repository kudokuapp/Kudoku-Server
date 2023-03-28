import { EMoneyAccount, EMoneyTransaction } from '@prisma/client';
import { decodeEMoneyAccountId } from '../../../utils/auth/eMoneyAccountId';
import { arg, extendType, nonNull } from 'nexus';

interface IPayloadEMoneyTransaction {
  mutationType: 'ADD' | 'EDIT' | 'DELETE';
  transaction: EMoneyTransaction;
}

interface IPayloadUpdatedEMoneyAccount {
  eMoneyAccountUpdate: EMoneyAccount;
}

export const EMoneyTransactionSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('eMoneyTransactionLive', {
      type: 'EMoneyTransactionSubscriptionType',
      description: 'Subscription for e-money transaction',
      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The eMoneyAccountId associated with that e-money account',
          })
        ),
      },

      subscribe: async (__, { eMoneyAccountId }, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(`eMoneyTransactionLive_${eMoneyAccountId}`);
      },

      resolve: async (
        payload: IPayloadEMoneyTransaction,
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
          eMoneyAccountId: decodeEMoneyAccountId(transaction.eMoneyAccountId),
          dateTimestamp: transaction.dateTimestamp,
          institutionId: transaction.institutionId,
          currency: transaction.currency,
          amount: transaction.amount,
          isReviewed: transaction.isReviewed,
          merchant: merchant,
          merchantId: transaction.merchantId,
          category: transaction.category as
            | { amount: string; name: string }[]
            | null
            | undefined,
          transactionType: transaction.transactionType,
          description: transaction.description,
          internalTransferTransactionId:
            transaction.internalTransferTransactionId,
          direction: transaction.direction,
          notes: transaction.notes,
          location: transaction.location,
          tags: transaction.tags as
            | { amount: string; name: string }[]
            | null
            | undefined,
          isHideFromBudget: transaction.isHideFromBudget,
          isHideFromInsight: transaction.isHideFromInsight,
        };

        return { mutationType, transaction: obj };
      },
    });
  },
});

export const EMoneyAccountSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('updatedEMoneyAccountLive', {
      type: 'EMoneyAccount',
      description: 'Subscription for e-money account',
      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The eMoneyAccountId associated with that e-money account',
          })
        ),
      },

      subscribe: async (__, { eMoneyAccountId }, { pubsub }, ___) => {
        return pubsub.asyncIterator(`eMoneyAccountUpdated_${eMoneyAccountId}`);
      },

      resolve: async (payload: IPayloadUpdatedEMoneyAccount, __, ____, ___) => {
        const { eMoneyAccountUpdate } = payload;

        return {
          id: eMoneyAccountUpdate.id,
          userId: eMoneyAccountUpdate.userId,
          institutionId: eMoneyAccountUpdate.institutionId,
          cardNumber: eMoneyAccountUpdate.cardNumber,
          createdAt: eMoneyAccountUpdate.createdAt,
          lastUpdate: eMoneyAccountUpdate.lastUpdate,
          balance: eMoneyAccountUpdate.balance,
          currency: eMoneyAccountUpdate.currency,
        };
      },
    });
  },
});
