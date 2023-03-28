import { arg, extendType, nonNull, list } from 'nexus';
import { TransactionType } from '@prisma/client';
import _ from 'lodash';
import {
  decodeEMoneyAccountId,
  encodeEMoneyAccountId,
} from '../../../utils/auth/eMoneyAccountId';
import updateBalance from '../../../utils/transaction/updateBalance';

export const EMoneyAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createEMoneyAccount', {
      type: 'EMoneyAccount',
      description: 'Create an E-Money account',

      args: {
        institutionId: nonNull(
          arg({
            type: 'String',
            description: 'The institution ID',
          })
        ),

        cardNumber: nonNull(
          arg({
            type: 'String',
            description: 'The e-money card number',
          })
        ),

        initialBalance: nonNull(
          arg({
            type: 'String',
            description: 'The initial balance for that e-money',
          })
        ),

        currency: nonNull(
          arg({
            type: 'String',
            description: 'The currency according to ISO standard',
            default: 'IDR',
          })
        ),
      },

      async resolve(
        __,
        { institutionId, cardNumber, initialBalance, currency },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Avoid account duplication
           */

          const searchEMoneyAccount = await prisma.eMoneyAccount.findFirst({
            where: {
              AND: [{ userId: user.id }, { cardNumber }, { institutionId }],
            },
          });

          if (searchEMoneyAccount) throw new Error('Akun e-money sudah ada.');

          const response = await prisma.eMoneyAccount.create({
            data: {
              institutionId,
              userId: user.id,
              cardNumber,
              balance: initialBalance,
              currency,
              createdAt: new Date(),
              lastUpdate: new Date(),
            },
          });

          return {
            id: response.id,
            userId: response.userId,
            institutionId: response.institutionId,
            cardNumber: response.cardNumber,
            balance: response.balance,
            createdAt: response.createdAt,
            lastUpdate: response.lastUpdate,
            currency: response.currency,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('reconcileEMoneyAccount', {
      type: 'EMoneyAccount',
      description: 'Reconcile e-money balance',
      args: {
        newBalance: nonNull(
          arg({
            type: 'String',
            description: 'The new balance',
          })
        ),
        eMoneyAccountId: nonNull(
          arg({ type: 'String', description: 'The cash account id' })
        ),
      },

      async resolve(
        __,
        { newBalance, eMoneyAccountId },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          if (Number(newBalance) === Number(eMoneyAccount.balance))
            throw new Error(
              'Untuk reconcile, balance baru tidak boleh sama dengan balance yang sekarang.'
            );

          const response = await prisma.eMoneyAccount.update({
            where: { id: eMoneyAccount.id },
            data: { balance: newBalance, lastUpdate: new Date() },
          });

          await pubsub.publish(`eMoneyAccountUpdated_${eMoneyAccount.id}`, {
            eMoneyAccountUpdate: response,
          });

          const bigger = Number(newBalance) > Number(eMoneyAccount.balance);

          const transactionAmount = bigger
            ? Number(newBalance) - Number(eMoneyAccount.balance)
            : Number(eMoneyAccount.balance) - Number(newBalance);

          const transaction = await prisma.eMoneyTransaction.create({
            data: {
              eMoneyAccountId: encodeEMoneyAccountId(eMoneyAccount.id),
              transactionName: 'RECONCILE',
              dateTimestamp: new Date(),
              currency: eMoneyAccount.currency,
              amount: transactionAmount.toString(),
              transactionType: 'RECONCILE',
              direction: bigger ? 'IN' : 'OUT',
              merchantId: '640ff9450ce7b9e3754d332c',
              isHideFromBudget: true,
              isHideFromInsight: true,
              isReviewed: true,
              institutionId: eMoneyAccount.institutionId,
            },
          });

          await pubsub.publish(`eMoneyTransactionLive_${eMoneyAccount.id}`, {
            mutationType: 'ADD',
            transaction,
          });

          return {
            id: response.id,
            userId: response.userId,
            institutionId: response.institutionId,
            cardNumber: response.cardNumber,
            balance: response.balance,
            createdAt: response.createdAt,
            lastUpdate: response.lastUpdate,
            currency: response.currency,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('deleteEMoneyAccount', {
      type: 'ResponseMessage',
      description: 'Delete e-money account',

      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The e-money account id',
          })
        ),
      },

      async resolve(__, { eMoneyAccountId }, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          await prisma.eMoneyAccount.delete({
            where: { id: eMoneyAccount.id },
          });

          const transaction = await prisma.eMoneyTransaction.findMany();

          let count = 0;

          for (let i = 0; i < transaction.length; i++) {
            const element = transaction[i];

            const decodedEMoneyAccount = decodeEMoneyAccountId(
              element.eMoneyAccountId
            );

            if (decodedEMoneyAccount === eMoneyAccount.id) {
              await prisma.eMoneyTransaction.delete({
                where: { id: element.id },
              });
              count += 1;
            }
          }

          return {
            response: `Successfully delete cash account with id ${eMoneyAccount.id} and ${count} transactions associated with that account`,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const EMoneyTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addEMoneyTransaction', {
      type: 'EMoneyTransaction',
      description:
        'Add transaction and balance for a particular e-money account',

      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-money account id',
          })
        ),

        transactionName: nonNull(
          arg({
            type: 'String',
            description: 'The transaction name',
          })
        ),

        currency: nonNull(
          arg({
            type: 'String',
            description: 'The ISO currency',
            default: 'IDR',
          })
        ),

        amount: nonNull(
          arg({
            type: 'String',
            description: 'The amount for that transaction',
          })
        ),

        merchantId: nonNull(
          arg({
            type: 'String',
            description: 'The merchant ID',
          })
        ),

        category: nonNull(
          arg({
            type: list('NameAmountJsonInput'),
            description: 'The category of the transaction',
          })
        ),

        transactionType: nonNull(
          arg({
            type: 'String',
            description:
              "The transaction type. It's either `INCOME`, `EXPENSE`, or `TRANSFER`",
          })
        ),

        direction: nonNull(
          arg({
            type: 'DirectionTypeEnum',
            description: 'The direction for this transaction. `IN` or `OUT`',
          })
        ),

        notes: arg({
          type: 'String',
          description: 'Notes for the transaction',
        }),

        description: arg({
          type: 'String',
          description: 'Description for the transaction',
        }),

        institutionId: nonNull(
          arg({
            type: 'String',
            description: 'The institution ID',
          })
        ),

        location: arg({
          type: 'LocationInputType',
          description: 'The location for this transaction',
        }),

        tags: arg({
          type: list('NameAmountJsonInput'),
          description: 'The tags for this transaction',
        }),

        isHideFromBudget: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from budget. default: false',
          default: false,
        }),

        isHideFromInsight: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from insight. default: false',
          default: false,
        }),
      },

      async resolve(
        __,
        {
          eMoneyAccountId,
          transactionName,
          currency,
          amount,
          merchantId,
          category,
          transactionType,
          direction,
          notes,
          description,
          institutionId,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          if (category) {
            let categorySum: number = 0;

            for (let i = 0; i < category.length; i++) {
              const element = category[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.'
                );

              categorySum += Number(element.amount);
            }

            if (categorySum !== Number(amount))
              throw new Error(
                'Total amount kategori harus sama dengan amount transaksi.'
              );
          }

          if (tags) {
            let tagsSum: number = 0;

            for (let i = 0; i < tags.length; i++) {
              const element = tags[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Tags harus dalam format {name, amount} untuk tiap tags.'
                );

              tagsSum += Number(element.amount);
            }

            if (tagsSum > Number(amount))
              throw new Error(
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.'
              );
          }

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          const response = await prisma.eMoneyTransaction.create({
            data: {
              transactionName,
              dateTimestamp: new Date(),
              isReviewed: true,
              eMoneyAccountId: encodeEMoneyAccountId(eMoneyAccount.id),
              currency,
              amount,
              merchantId,
              category,
              transactionType: transactionType as TransactionType,
              notes,
              description,
              institutionId,
              location,
              tags,
              isHideFromBudget,
              isHideFromInsight,
              direction,
            },
          });

          await pubsub.publish(`eMoneyTransactionLive_${eMoneyAccount.id}`, {
            mutationType: 'ADD',
            transaction: response,
          });

          /**
           * Update balance after pulling new transaction
           */

          const updatedEMoneyAccount = await prisma.eMoneyAccount.update({
            where: { id: eMoneyAccountId },
            data: {
              balance: updateBalance({
                balance: eMoneyAccount.balance,
                amount: response.amount,
                direction: response.direction,
                reverse: false,
              }).toString(),
              lastUpdate: new Date(),
            },
          });

          await pubsub.publish(`eMoneyAccountUpdated_${eMoneyAccount.id}`, {
            eMoneyAccountUpdate: updatedEMoneyAccount,
          });

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            transactionName: response.transactionName,
            eMoneyAccountId: decodeEMoneyAccountId(response.eMoneyAccountId),
            dateTimestamp: response.dateTimestamp,
            institutionId: response.institutionId,
            currency: response.currency,
            amount: response.amount,
            isReviewed: response.isReviewed,
            merchant: merchant,
            merchantId: response.merchantId,
            category: response.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            transactionType: response.transactionType,
            description: response.description,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isHideFromBudget: response.isHideFromBudget,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('editEMoneyTransaction', {
      type: 'EMoneyTransaction',
      description:
        "Edit a particular e-money transaction and update it's balance",

      args: {
        transactionId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-money transaction id',
          })
        ),

        transactionName: arg({
          type: 'String',
          description: 'The transaction name',
        }),

        merchantId: arg({
          type: 'String',
          description: 'The merchant ID',
        }),

        category: arg({
          type: list('NameAmountJsonInput'),
          description: 'The category of the transaction',
        }),

        notes: arg({
          type: 'String',
          description: 'Notes for the transaction',
        }),

        location: arg({
          type: 'LocationInputType',
          description: 'The location for this transaction',
        }),

        tags: arg({
          type: list('NameAmountJsonInput'),
          description: 'The tags for this transaction',
        }),

        isHideFromBudget: arg({
          type: 'Boolean',
          description:
            'Whether or not this transaction is hide from budget. default: false',
          default: false,
        }),

        isHideFromInsight: arg({
          type: 'Boolean',
          description:
            'Whether or not this transaction is hide from insight. default: false',
          default: false,
        }),

        transactionType: arg({
          type: 'ExpenseTypeEnum',
          description:
            'The transaction type. Either INCOME for in transation, and EXPENSE for outgoing transaction',
        }),

        direction: arg({
          type: 'DirectionTypeEnum',
          description: 'The direction for this transaction. `IN` or `OUT`',
        }),
      },

      async resolve(
        __,
        {
          transactionId,
          transactionName,
          direction,
          merchantId,
          category,
          notes,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
          transactionType,
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (
            !merchantId &&
            !transactionName &&
            !category &&
            !direction &&
            !notes &&
            !location &&
            !tags &&
            !isHideFromBudget &&
            !isHideFromInsight &&
            !transactionType
          )
            throw new Error('Semua value tidak boleh null atau undefined.');

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const transaction = await prisma.eMoneyTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          /**
           * Check if the category match the amount
           */
          if (category) {
            let categorySum: number = 0;

            for (let i = 0; i < category.length; i++) {
              const element = category[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.'
                );

              categorySum += Number(element.amount);
            }

            if (categorySum !== Number(transaction.amount))
              throw new Error(
                'Total amount kategori harus sama dengan amount transaksi.'
              );
          }

          /**
           * Check if the tags match the amount
           */
          if (tags) {
            let tagsSum: number = 0;

            for (let i = 0; i < tags.length; i++) {
              const element = tags[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Tags harus dalam format {name, amount} untuk tiap tags.'
                );

              tagsSum += Number(element.amount);
            }

            if (tagsSum !== Number(transaction.amount))
              throw new Error(
                'Total amount tags harus sama dengan amount transaksi.'
              );
          }

          const response = await prisma.eMoneyTransaction.update({
            where: { id: transaction.id },
            data: {
              isReviewed: true,
              merchantId: merchantId ?? transaction.merchantId,
              category: category ?? transaction.category,
              notes: notes ?? transaction.notes,
              location: location ?? transaction.location,
              tags: tags ?? transaction.tags,
              isHideFromBudget:
                isHideFromBudget ?? transaction.isHideFromBudget,
              isHideFromInsight:
                isHideFromInsight ?? transaction.isHideFromInsight,
              transactionType: transactionType ?? transaction.transactionType,
              direction: direction ?? transaction.direction,
            },
          });

          const decodedEMoneyAccountId = decodeEMoneyAccountId(
            response.eMoneyAccountId
          );

          await pubsub.publish(
            `eMoneyTransactionLive_${decodedEMoneyAccountId}`,
            {
              mutationType: 'EDIT',
              transaction: response,
            }
          );

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            transactionName: response.transactionName,
            eMoneyAccountId: decodeEMoneyAccountId(response.eMoneyAccountId),
            dateTimestamp: response.dateTimestamp,
            institutionId: response.institutionId,
            currency: response.currency,
            amount: response.amount,
            isReviewed: response.isReviewed,
            merchant,
            merchantId: response.merchantId,
            category: response.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            transactionType: response.transactionType,
            description: response.description,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isHideFromBudget: response.isHideFromBudget,
            internalTransferTransactionId:
              response.internalTransferTransactionId,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('deleteEMoneyTransaction', {
      type: 'ResponseMessage',
      description: 'Delete a particular e-money transaction',

      args: {
        transactionId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-money transaction id',
          })
        ),
      },

      async resolve(__, { transactionId }, { userId, prisma, pubsub }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const transaction = await prisma.eMoneyTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          const { eMoneyAccountId: _eMoneyAccountId } = transaction;

          const eMoneyAccountId = decodeEMoneyAccountId(_eMoneyAccountId);

          const eMoneyAccount = await prisma.eMoneyAccount.findFirstOrThrow({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          /**
           * Update balance
           */
          const updatedEMoneyAccount = await prisma.eMoneyAccount.update({
            where: { id: eMoneyAccountId },
            data: {
              balance: updateBalance({
                balance: eMoneyAccount.balance,
                amount: transaction.amount,
                direction: transaction.direction,
                reverse: true,
              }).toString(),
              lastUpdate: new Date(),
            },
          });

          const deletedTransaction = await prisma.eMoneyTransaction.delete({
            where: { id: transactionId },
          });

          await pubsub.publish(`eMoneyTransactionLive_${eMoneyAccount.id}`, {
            mutationType: 'DELETE',
            transaction: deletedTransaction,
          });

          await pubsub.publish(`eMoneyAccountUpdated_${eMoneyAccount.id}`, {
            eMoneyAccountUpdate: updatedEMoneyAccount,
          });

          return {
            response: `Successfully delete transaction of ${transactionId} and update balance`,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
