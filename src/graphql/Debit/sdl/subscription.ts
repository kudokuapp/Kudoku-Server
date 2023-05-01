import { DebitAccount, DebitTransaction } from '@prisma/client';
import { arg, extendType, nonNull } from 'nexus';
import { decodeDebitAccountId } from '../../../utils/auth';

interface IPayloadDebitTransaction {
  mutationType: 'ADD' | 'EDIT' | 'DELETE';
  transaction: DebitTransaction;
}

interface IPayloadUpdatedDebitAccount {
  debitAccountUpdate: DebitAccount;
}

export const DebitTransactionSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('debitTransactionLive', {
      type: 'DebitTransactionSubscriptionType',
      description: 'Subscription for debit transaction',
      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The debitAccountId associated with that debit account',
          })
        ),
      },

      subscribe: async (__, { debitAccountId }, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(`debitTransactionLive_${debitAccountId}`);
      },

      resolve: async (
        payload: IPayloadDebitTransaction,
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
          debitAccountId: decodeDebitAccountId(transaction.debitAccountId),
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
          isSubscription: transaction.isSubscription,
          notes: transaction.notes,
          location: transaction.location,
          tags: transaction.tags as
            | { amount: string; name: string }[]
            | null
            | undefined,
          isHideFromBudget: transaction.isHideFromBudget,
          isHideFromInsight: transaction.isHideFromInsight,
          transactionMethod: transaction.transactionMethod,
        };

        return { mutationType, transaction: obj };
      },
    });
  },
});

export const DebitAccountSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('updatedDebitAccountLive', {
      type: 'DebitAccount',
      description: 'Subscription for debit account',
      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description:
              'The debitAccountId associated with that debit account',
          })
        ),
      },

      subscribe: async (__, { debitAccountId }, { pubsub }, ___) => {
        return pubsub.asyncIterator(`debitAccountUpdated_${debitAccountId}`);
      },

      resolve: async (payload: IPayloadUpdatedDebitAccount, __, ____, ___) => {
        const { debitAccountUpdate } = payload;

        return {
          id: debitAccountUpdate.id,
          userId: debitAccountUpdate.userId,
          institutionId: debitAccountUpdate.institutionId,
          accountNumber: debitAccountUpdate.accountNumber,
          createdAt: debitAccountUpdate.createdAt,
          lastUpdate: debitAccountUpdate.lastUpdate,
          balance: debitAccountUpdate.balance,
          currency: debitAccountUpdate.currency,
          expired: debitAccountUpdate.expired,
        };
      },
    });
  },
});
