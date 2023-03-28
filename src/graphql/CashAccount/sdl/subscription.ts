import { CashAccount, CashTransaction } from '@prisma/client';
import { decodeCashAccountId } from '../../../utils/auth/cashAccountId';
import { arg, extendType, nonNull } from 'nexus';

interface IPayloadCashTransaction {
  mutationType: 'ADD' | 'EDIT' | 'DELETE';
  transaction: CashTransaction;
}

interface IPayloadUpdatedCashAccount {
  cashAccountUpdate: CashAccount;
}

export const CashTransactionSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('cashTransactionLive', {
      type: 'CashTransactionSubscriptionType',
      description: 'Subscription for cash transaction',
      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The cashAccountId associated with that cash account',
          })
        ),
      },

      subscribe: async (__, { cashAccountId }, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(`cashTransactionLive_${cashAccountId}`);
      },

      resolve: async (
        payload: IPayloadCashTransaction,
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
          dateTimestamp: transaction.dateTimestamp,
          cashAccountId: decodeCashAccountId(transaction.cashAccountId),
          currency: transaction.currency,
          transactionName: transaction.transactionName,
          amount: transaction.amount,
          merchant: merchant,
          merchantId: transaction.merchantId,
          category: transaction.category as
            | { amount: string; name: string }[]
            | null
            | undefined,
          transactionType: transaction.transactionType,
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

export const CashAccountSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('updatedCashAccountLive', {
      type: 'CashAccount',
      description: 'Subscription for cash account',
      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The cashAccountId associated with that cash account',
          })
        ),
      },

      subscribe: async (__, { cashAccountId }, { pubsub }, ___) => {
        return pubsub.asyncIterator(`cashAccountUpdated_${cashAccountId}`);
      },

      resolve: async (payload: IPayloadUpdatedCashAccount, __, ____, ___) => {
        const { cashAccountUpdate } = payload;

        return {
          id: cashAccountUpdate.id,
          userId: cashAccountUpdate.userId,
          createdAt: cashAccountUpdate.createdAt,
          lastUpdate: cashAccountUpdate.lastUpdate,
          accountName: cashAccountUpdate.accountName,
          displayPicture: cashAccountUpdate.displayPicture,
          balance: cashAccountUpdate.balance,
          currency: cashAccountUpdate.currency,
        };
      },
    });
  },
});
