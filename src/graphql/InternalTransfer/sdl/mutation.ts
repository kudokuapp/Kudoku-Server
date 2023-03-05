import { arg, extendType, nonNull } from 'nexus';
import {
  CashTransaction,
  DebitTransaction,
  EMoneyTransaction,
  EWalletTransaction,
} from '@prisma/client';

export const InternalTransferMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('internalTransferSelect', {
      type: 'ResponseMessage',
      description:
        'Make a transaction as an Internal Transfer, but selecting an already existing transaction. This is suitable for automatic account transfered to automatic account, and manual account transfered to automatic account.',
      args: {
        from: nonNull(
          arg({
            type: 'String',
            description: 'From transaction id',
          })
        ),
        fromAccount: nonNull(
          arg({
            type: 'typeOfAccount',
            description:
              'The type of account (from). See documentation for the appropriate input',
          })
        ),
        to: nonNull(
          arg({
            type: 'String',
            description: 'To transaction id',
          })
        ),
        toAccount: nonNull(
          arg({
            type: 'typeOfAccount',
            description:
              'The type of account (to). See documentation for the appropriate input',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const {
          from: fromTransactionId,
          to: toTransactionId,
          fromAccount,
          toAccount,
        } = args;
        const { userId, prisma } = context;

        /**
         * Selecting a `toAccount` Cannot be a manual account
         * Since we are 'selecting a transaction' that already exist
         */
        if (toAccount === 'CASH' || toAccount === 'EMONEY') {
          throw new Error('The `toAccount` cannot be a manual account');
        }

        if (!userId) {
          throw new Error('Invalid token');
        }

        await prisma.user.findFirstOrThrow({
          where: { id: userId },
        });

        let toTransaction: DebitTransaction | EWalletTransaction;

        switch (toAccount) {
          case 'DEBIT':
            toTransaction = await prisma.debitTransaction.findFirstOrThrow({
              where: { id: toTransactionId },
            });
            break;

          default:
            toTransaction = await prisma.eWalletTransaction.findFirstOrThrow({
              where: { id: toTransactionId },
            });
            break;
        }

        let fromTransaction:
          | CashTransaction
          | DebitTransaction
          | EWalletTransaction
          | EMoneyTransaction;

        switch (fromAccount) {
          case 'CASH':
            fromTransaction = await prisma.cashTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: null,
                location: null,
              },
            });
            break;

          case 'DEBIT':
            fromTransaction = await prisma.debitTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: null,
                isReviewed: true,
                location: null,
              },
            });
            break;

          case 'EWALLET':
            fromTransaction = await prisma.eWalletTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: null,
                isReviewed: true,
                location: null,
              },
            });
            break;

          default:
            fromTransaction = await prisma.eMoneyTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: null,
                location: null,
              },
            });
            break;
        }

        switch (toAccount) {
          case 'DEBIT':
            await prisma.debitTransaction.update({
              where: { id: toTransaction.id },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'IN',
                internalTransferTransactionId: fromTransaction.id,
                category: null,
                merchantId: null,
                isReviewed: true,
                location: null,
              },
            });
            break;

          default:
            await prisma.eWalletTransaction.update({
              where: { id: toTransaction.id },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'IN',
                internalTransferTransactionId: fromTransaction.id,
                category: null,
                merchantId: null,
                isReviewed: true,
                location: null,
              },
            });
            break;
        }

        return {
          response: `Successfully make the transaction ${fromTransaction.id} as an internal transfer to ${toTransactionId}`,
        };
      },
    });

    t.nonNull.field('internalTransferCreate', {
      type: 'ResponseMessage',
      description:
        'Make a transaction as an Internal Transfer, creating a new transaction on the receiving account. This is suitable for manual account transfered to manual account, and automatic account transfered to manual account.',
      args: {
        from: nonNull(
          arg({
            type: 'String',
            description: 'From transaction id',
          })
        ),

        fromAccount: nonNull(
          arg({
            type: 'typeOfAccount',
            description:
              'The type of account (from). See documentation for the appropriate input',
          })
        ),

        toAccount: nonNull(
          arg({
            type: 'typeOfAccount',
            description:
              'The type of account (to). See documentation for the appropriate input',
          })
        ),

        toAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The account id (to).',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const {
          from: fromTransactionId,
          fromAccount,
          toAccount,
          toAccountId,
        } = args;
        const { userId, prisma } = context;

        if (!userId) {
          throw new Error('Invalid token');
        }

        /**
         * Selecting a `toAccount` Cannot be an automatic account
         * Since we are 'creating a transaction' that doesn't currently exist
         */
        if (toAccount === 'DEBIT' || toAccount === 'EWALLET') {
          throw new Error('The `toAccount` cannot be an automatic account');
        }

        await prisma.user.findFirstOrThrow({
          where: { id: userId },
        });

        let fromTransaction:
          | CashTransaction
          | DebitTransaction
          | EWalletTransaction
          | EMoneyTransaction;

        switch (fromAccount) {
          case 'CASH':
            fromTransaction = await prisma.cashTransaction.findFirstOrThrow({
              where: { id: fromTransactionId },
            });
            break;

          case 'DEBIT':
            fromTransaction = await prisma.debitTransaction.findFirstOrThrow({
              where: { id: fromTransactionId },
            });
            break;

          case 'EWALLET':
            fromTransaction = await prisma.eWalletTransaction.findFirstOrThrow({
              where: { id: fromTransactionId },
            });
            break;

          default:
            fromTransaction = await prisma.eMoneyTransaction.findFirstOrThrow({
              where: { id: fromTransactionId },
            });
            break;
        }

        let toTransaction: CashTransaction | EMoneyTransaction;

        switch (toAccount) {
          case 'CASH':
            const cashTransactionResponse =
              await prisma.cashAccount.findFirstOrThrow({
                where: { id: toAccountId },
              });
            toTransaction = await prisma.cashTransaction.create({
              data: {
                cashAccountId: cashTransactionResponse.id,
                dateTimestamp: new Date(fromTransaction.dateTimestamp),
                currency: fromTransaction.currency,
                transactionName: 'INTERNAL TRANSFER',
                amount: fromTransaction.amount,
                transactionType: 'TRANSFER',
                direction: 'IN',
              },
            });
            break;

          default:
            const eMoneyTransactionResponse =
              await prisma.eMoneyAccount.findFirstOrThrow({
                where: { id: toAccountId },
              });
            toTransaction = await prisma.eMoneyTransaction.create({
              data: {
                transactionName: 'INTERNAL TRANSFER',
                eMoneyAccountId: eMoneyTransactionResponse.id,
                dateTimestamp: new Date(fromTransaction.dateTimestamp),
                currency: fromTransaction.currency,
                amount: fromTransaction.amount,
                transactionType: 'TRANSFER',
                direction: 'IN',
                institutionId: eMoneyTransactionResponse.institutionId,
              },
            });
            break;
        }

        return {
          response: `Successfully make the transaction ${fromTransaction.id} as an internal transfer to ${toTransaction.id}`,
        };
      },
    });
  },
});
