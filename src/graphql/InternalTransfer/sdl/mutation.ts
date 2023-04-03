import { arg, extendType, nonNull } from 'nexus';
import {
  CashTransaction,
  DebitTransaction,
  EMoneyTransaction,
  EWalletTransaction,
  PayLaterTransaction,
} from '@prisma/client';
import {
  decodeCashAccountId,
  encodeCashAccountId,
  decodeDebitAccountId,
  decodeEWalletAccountId,
  decodePayLaterAccountId,
  decodeEMoneyAccountId,
  encodeEMoneyAccountId,
} from '../../../utils/auth';

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

      async resolve(
        __,
        {
          from: fromTransactionId,
          to: toTransactionId,
          fromAccount,
          toAccount,
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Selecting a `toAccount` Cannot be a manual account
           * Since we are 'selecting a transaction' that already exist
           */
          if (toAccount === 'CASH' || toAccount === 'EMONEY') {
            throw new Error(
              'Untuk internal transfer tipe select, tujuan akun tidak boleh akun manual.'
            );
          }

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
              toTransaction = await prisma.payLaterTransaction.findFirstOrThrow(
                {
                  where: { id: toTransactionId },
                }
              );
              break;
          }

          if (!toTransaction) throw new Error('toTransaction adalah null.');

          let fromTransaction:
            | CashTransaction
            | DebitTransaction
            | EWalletTransaction
            | EMoneyTransaction
            | PayLaterTransaction
            | null = null;

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

              await pubsub.publish(
                `cashTransactionLive_${decodeCashAccountId(
                  fromTransaction.cashAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `debitTransactionLive_${decodeDebitAccountId(
                  fromTransaction.debitAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `eWalletTransactionLive_${decodeEWalletAccountId(
                  fromTransaction.eWalletAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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

              await pubsub.publish(
                `payLaterTransactionLive_${decodePayLaterAccountId(
                  fromTransaction.payLaterAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `eMoneyTransactionLive_${decodeEMoneyAccountId(
                  fromTransaction.eMoneyAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
              break;
          }

          if (!fromTransaction) throw new Error('fromTransaction adalah null.');

          switch (toAccount) {
            case 'DEBIT':
              const debitTransactionToAccountUpdate =
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
              await pubsub.publish(
                `debitTransactionLive_${decodeDebitAccountId(
                  debitTransactionToAccountUpdate.debitAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: debitTransactionToAccountUpdate,
                }
              );
              break;

            case 'EWALLET':
              const eWalletTransactionToAccountUpdate =
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

              await pubsub.publish(
                `eWalletTransactionLive_${decodeEWalletAccountId(
                  eWalletTransactionToAccountUpdate.eWalletAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: eWalletTransactionToAccountUpdate,
                }
              );
              break;

            case 'PAYLATER':
              const payLaterTransactionToAccountUpdate =
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

              await pubsub.publish(
                `payLaterTransactionLive_${decodePayLaterAccountId(
                  payLaterTransactionToAccountUpdate.payLaterAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: payLaterTransactionToAccountUpdate,
                }
              );
              break;
          }

          return {
            response: `Successfully make the transaction ${fromTransaction.id} as an internal transfer to ${toTransactionId}`,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        { from: fromTransactionId, fromAccount, toAccount, toAccountId },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Selecting a `toAccount` Cannot be an automatic account
           * Since we are 'creating a transaction' that doesn't currently exist
           */
          if (
            toAccount === 'DEBIT' ||
            toAccount === 'EWALLET' ||
            toAccount === 'PAYLATER'
          )
            throw new Error(
              'Untuk internal transfer tipe create, tujuan akun tidak boleh akun otomatis.'
            );

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
              fromTransaction =
                await prisma.eWalletTransaction.findFirstOrThrow({
                  where: { id: fromTransactionId },
                });
              break;

            case 'PAYLATER':
              fromTransaction =
                await prisma.payLaterTransaction.findFirstOrThrow({
                  where: { id: fromTransactionId },
                });
              break;

            case 'EMONEY':
              fromTransaction = await prisma.eMoneyTransaction.findFirstOrThrow(
                {
                  where: { id: fromTransactionId },
                }
              );
              break;
          }

          if (!fromTransaction) throw new Error('fromTransaction adalah null.');

          let toTransaction: CashTransaction | EMoneyTransaction | null = null;

          switch (toAccount) {
            case 'CASH':
              const cashTransactionResponse =
                await prisma.cashAccount.findFirstOrThrow({
                  where: { id: toAccountId },
                });
              toTransaction = await prisma.cashTransaction.create({
                data: {
                  cashAccountId: encodeCashAccountId(
                    cashTransactionResponse.id
                  ),
                  dateTimestamp: new Date(fromTransaction.dateTimestamp),
                  currency: fromTransaction.currency,
                  transactionName: 'INTERNAL TRANSFER',
                  amount: fromTransaction.amount,
                  transactionType: 'TRANSFER',
                  direction: 'IN',
                  merchantId: '640ff9670ce7b9e3754d332d',
                },
              });

              await pubsub.publish(
                `cashTransactionLive_${decodeCashAccountId(
                  toTransaction.cashAccountId
                )}`,
                {
                  mutationType: 'ADD',
                  transaction: toTransaction,
                }
              );
              break;

            case 'EMONEY':
              const eMoneyTransactionResponse =
                await prisma.eMoneyAccount.findFirstOrThrow({
                  where: { id: toAccountId },
                });
              toTransaction = await prisma.eMoneyTransaction.create({
                data: {
                  transactionName: 'INTERNAL TRANSFER',
                  eMoneyAccountId: encodeEMoneyAccountId(
                    eMoneyTransactionResponse.id
                  ),
                  dateTimestamp: new Date(fromTransaction.dateTimestamp),
                  currency: fromTransaction.currency,
                  amount: fromTransaction.amount,
                  transactionType: 'TRANSFER',
                  direction: 'IN',
                  institutionId: eMoneyTransactionResponse.institutionId,
                  merchantId: '640ff9670ce7b9e3754d332d',
                },
              });

              await pubsub.publish(
                `eMoneyTransactionLive_${decodeEMoneyAccountId(
                  toTransaction.eMoneyAccountId
                )}`,
                {
                  mutationType: 'ADD',
                  transaction: toTransaction,
                }
              );
              break;
          }

          if (!toTransaction) throw new Error('toTransaction adalah null.');

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

              await pubsub.publish(
                `cashTransactionLive_${decodeCashAccountId(
                  fromTransaction.cashAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `debitTransactionLive_${decodeDebitAccountId(
                  fromTransaction.debitAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `eWalletTransactionLive_${decodeEWalletAccountId(
                  fromTransaction.eWalletAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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

              await pubsub.publish(
                `payLaterTransactionLive_${decodePayLaterAccountId(
                  fromTransaction.payLaterAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
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
              await pubsub.publish(
                `eMoneyTransactionLive_${decodeEMoneyAccountId(
                  fromTransaction.eMoneyAccountId
                )}`,
                {
                  mutationType: 'EDIT',
                  transaction: fromTransaction,
                }
              );
              break;
          }

          return {
            response: `Successfully make the transaction ${fromTransaction.id} as an internal transfer to ${toTransaction.id}`,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
