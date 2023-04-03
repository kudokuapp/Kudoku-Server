import { EWalletAccount, EWalletTransaction } from '@prisma/client';
import { decodeEWalletAccountId } from '../../../utils/auth';
import { arg, extendType, nonNull } from 'nexus';

interface IPayloadEWalletTransaction {
  mutationType: 'ADD' | 'EDIT' | 'DELETE';
  transaction: EWalletTransaction;
}

interface IPayloadUpdatedEWalletAccount {
  eWalletAccountUpdate: EWalletAccount;
}

export const EWalletTransactionSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('eWalletTransactionLive', {
      type: 'EWalletTransactionSubscriptionType',
      description: 'Subscription for e-wallet transaction',
      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The eWalletAccountId associated with that e-wallet account',
          })
        ),
      },

      subscribe: async (__, { eWalletAccountId }, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(
          `eWalletTransactionLive_${eWalletAccountId}`
        );
      },

      resolve: async (
        payload: IPayloadEWalletTransaction,
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
          eWalletAccountId: decodeEWalletAccountId(
            transaction.eWalletAccountId
          ),
          dateTimestamp: transaction.dateTimestamp,
          referenceId: transaction.referenceId,
          institutionId: transaction.institutionId,
          currency: transaction.currency,
          amount: transaction.amount,
          onlineTransaction: transaction.onlineTransaction,
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
          isSubscription: transaction.isSubscription,
          isHideFromBudget: transaction.isHideFromBudget,
          isHideFromInsight: transaction.isHideFromInsight,
        };

        return { mutationType, transaction: obj };
      },
    });
  },
});

export const EWalletAccountSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('updatedEWalletAccountLive', {
      type: 'EWalletAccount',
      description: 'Subscription for e-wallet account',
      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The eWalletAccountId associated with that e-wallet account',
          })
        ),
      },

      subscribe: async (__, { eWalletAccountId }, { pubsub }, ___) => {
        return pubsub.asyncIterator(
          `eWalletAccountUpdated_${eWalletAccountId}`
        );
      },

      resolve: async (
        payload: IPayloadUpdatedEWalletAccount,
        __,
        ____,
        ___
      ) => {
        const { eWalletAccountUpdate } = payload;

        return {
          id: eWalletAccountUpdate.id,
          userId: eWalletAccountUpdate.userId,
          createdAt: eWalletAccountUpdate.createdAt,
          lastUpdate: eWalletAccountUpdate.lastUpdate,
          balance: eWalletAccountUpdate.balance,
          currency: eWalletAccountUpdate.currency,
          institutionId: eWalletAccountUpdate.institutionId,
          accountNumber: eWalletAccountUpdate.accountNumber,
          expired: eWalletAccountUpdate.expired,
        };
      },
    });
  },
});
