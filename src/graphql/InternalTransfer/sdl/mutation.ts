import { arg, extendType, nonNull } from 'nexus';
import {
  CashTransaction,
  DebitTransaction,
  EMoneyTransaction,
  EWalletTransaction,
  PayLaterTransaction,
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
          throw {
            status: 2600,
            message:
              'Untuk internal transfer tipe select, tujuan akun tidak boleh akun manual.',
          };
        }

        if (!userId) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        let toTransaction:
          | DebitTransaction
          | EWalletTransaction
          | PayLaterTransaction
          | null = null;

        switch (toAccount) {
          case 'DEBIT':
            toTransaction = await prisma.debitTransaction.findFirstOrThrow({
              where: { id: toTransactionId },
            });
            break;

          case 'EWALLET':
            toTransaction = await prisma.eWalletTransaction.findFirstOrThrow({
              where: { id: toTransactionId },
            });
            break;

          case 'PAYLATER':
            toTransaction = await prisma.payLaterTransaction.findFirstOrThrow({
              where: { id: toTransactionId },
            });
            break;
        }

        let fromTransaction:
          | CashTransaction
          | DebitTransaction
          | EWalletTransaction
          | EMoneyTransaction
          | PayLaterTransaction
          | null = null;

        if (!toTransaction)
          throw { status: 2601, message: 'toTransaction adalah null.' };

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
                merchantId: '640ff9670ce7b9e3754d332d',
                location: null,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
              },
            });
            break;

          case 'DEBIT':
            fromTransaction = await prisma.debitTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                tags: null,
                isSubscription: false,
                isReviewed: true,
                location: null,
                notes: null,
                transactionMethod: 'UNDEFINED',
              },
            });
            break;

          case 'EWALLET':
            fromTransaction = await prisma.eWalletTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                isSubscription: false,
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                isReviewed: true,
                location: null,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
              },
            });
            break;

          case 'PAYLATER':
            fromTransaction = await prisma.payLaterTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                isSubscription: false,
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                isReviewed: true,
                location: null,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
              },
            });
            break;

          case 'EMONEY':
            fromTransaction = await prisma.eMoneyTransaction.update({
              where: { id: fromTransactionId },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                transactionType: 'TRANSFER',
                direction: 'OUT',
                internalTransferTransactionId: toTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                location: null,
                isReviewed: true,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
              },
            });
            break;
        }

        if (!fromTransaction)
          throw { status: 2602, message: 'fromTransaction adalah null.' };

        switch (toAccount) {
          case 'DEBIT':
            await prisma.debitTransaction.update({
              where: { id: toTransaction.id },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                transactionType: 'TRANSFER',
                direction: 'IN',
                internalTransferTransactionId: fromTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                tags: null,
                isSubscription: false,
                isReviewed: true,
                location: null,
                notes: null,
                transactionMethod: 'UNDEFINED',
              },
            });
            break;

          case 'EWALLET':
            await prisma.eWalletTransaction.update({
              where: { id: toTransaction.id },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                isSubscription: false,
                transactionType: 'TRANSFER',
                direction: 'IN',
                internalTransferTransactionId: fromTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                isReviewed: true,
                location: null,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
              },
            });
            break;

          case 'PAYLATER':
            await prisma.payLaterTransaction.update({
              where: { id: toTransaction.id },
              data: {
                transactionName: 'INTERNAL TRANSFER',
                onlineTransaction: false,
                isSubscription: false,
                transactionType: 'TRANSFER',
                direction: 'IN',
                internalTransferTransactionId: fromTransaction.id,
                category: null,
                merchantId: '640ff9670ce7b9e3754d332d',
                isReviewed: true,
                location: null,
                notes: null,
                tags: null,
                isHideFromBudget: true,
                isHideFromInsight: true,
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
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        /**
         * Selecting a `toAccount` Cannot be an automatic account
         * Since we are 'creating a transaction' that doesn't currently exist
         */
        if (
          toAccount === 'DEBIT' ||
          toAccount === 'EWALLET' ||
          toAccount === 'PAYLATER'
        ) {
          throw {
            status: 2700,
            message:
              'Untuk internal transfer tipe create, tujuan akun tidak boleh akun otomatis.',
          };
        }

        let fromTransaction:
          | CashTransaction
          | DebitTransaction
          | EWalletTransaction
          | EMoneyTransaction
          | PayLaterTransaction
          | null = null;

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

          case 'PAYLATER':
            fromTransaction = await prisma.payLaterTransaction.findFirstOrThrow(
              {
                where: { id: fromTransactionId },
              }
            );
            break;

          case 'EMONEY':
            fromTransaction = await prisma.eMoneyTransaction.findFirstOrThrow({
              where: { id: fromTransactionId },
            });
            break;
        }

        let toTransaction: CashTransaction | EMoneyTransaction | null = null;

        if (!fromTransaction)
          throw { status: 2602, message: 'fromTransaction adalah null.' };

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
                merchantId: '640ff9670ce7b9e3754d332d',
              },
            });
            break;

          case 'EMONEY':
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
                merchantId: '640ff9670ce7b9e3754d332d',
              },
            });
            break;
        }

        if (!toTransaction)
          throw { status: 2601, message: 'toTransaction adalah null.' };

        return {
          response: `Successfully make the transaction ${fromTransaction.id} as an internal transfer to ${toTransaction.id}`,
        };
      },
    });
  },
});
