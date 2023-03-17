import { arg, extendType, nonNull, list, enumType } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { Merchant, TransactionType } from '@prisma/client';
import { DirectionTypeEnum } from '../../Enum';
import _ from 'lodash';
import { updateBalance } from '../../../utils/transaction';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';
import {
  decodeEMoneyAccountId,
  encodeEMoneyAccountId,
} from '../../../utils/auth';

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

      async resolve(parent, args, context, info) {
        const { institutionId, cardNumber, initialBalance, currency } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const searchUser = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!searchUser) {
          throw { status: 1000, message: 'User tidak ditemukan.' };
        }

        /*
        Avoid account duplication
        */

        const searchEMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: {
            AND: [{ userId: searchUser.id }, { cardNumber }, { institutionId }],
          },
        });

        if (searchEMoneyAccount)
          throw { status: 6000, message: 'Akun e-money sudah ada.' };

        const response = await prisma.eMoneyAccount.create({
          data: {
            institutionId,
            userId: searchUser.id,
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
          createdAt: toTimeStamp(response.createdAt),
          lastUpdate: toTimeStamp(response.lastUpdate),
          currency: response.currency,
        };
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

      async resolve(parent, args, context, info) {
        const { newBalance, eMoneyAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

        if (Number(newBalance) === Number(eMoneyAccount.balance))
          throw {
            status: 2000,
            message:
              'Untuk reconcile, balance baru tidak boleh sama dengan balance yang sekarang.',
          };

        const response = await prisma.eMoneyAccount.update({
          where: { id: eMoneyAccount.id },
          data: { balance: newBalance, lastUpdate: new Date() },
        });

        const bigger = Number(newBalance) > Number(eMoneyAccount.balance);

        const transactionAmount = bigger
          ? Number(newBalance) - Number(eMoneyAccount.balance)
          : Number(eMoneyAccount.balance) - Number(newBalance);

        await prisma.eMoneyTransaction.create({
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

        return {
          id: response.id,
          userId: response.userId,
          institutionId: response.institutionId,
          cardNumber: response.cardNumber,
          balance: response.balance,
          createdAt: toTimeStamp(response.createdAt),
          lastUpdate: toTimeStamp(response.lastUpdate),
          currency: response.currency,
        };
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

      async resolve(parent, args, context, info) {
        const { eMoneyAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId }] },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

        await prisma.eMoneyAccount.delete({ where: { id: eMoneyAccount.id } });

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
            type: DirectionTypeEnum,
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

      async resolve(parent, args, context, info) {
        const {
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
        } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        if (category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (
              !element ||
              !element.hasOwnProperty('name') ||
              !element.hasOwnProperty('amount')
            )
              throw {
                status: 2300,
                message:
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.',
              };

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw {
              status: 2200,
              message:
                'Total amount kategori harus sama dengan amount transaksi.',
            };
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
              throw {
                status: 2301,
                message:
                  'Tags harus dalam format {name, amount} untuk tiap tags.',
              };

            tagsSum += Number(element.amount);
          }

          if (tagsSum > Number(amount))
            throw {
              status: 2201,
              message:
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.',
            };
        }

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

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

        /*
        Update balance after pulling new transaction
        */

        await prisma.eMoneyAccount.update({
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

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        return {
          id: response.id,
          transactionName: response.transactionName,
          eMoneyAccountId: response.eMoneyAccountId,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          isReviewed: response.isReviewed,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
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

        amount: arg({
          type: 'String',
          description: 'The amount for that transaction',
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

      async resolve(parent, args, context, info) {
        const {
          transactionId,
          transactionName,
          direction,
          amount,
          merchantId,
          category,
          notes,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
          transactionType,
        } = args;

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
          !transactionType &&
          !amount
        )
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };

        if (amount && !category)
          throw {
            status: 2004,
            message: 'Amount baru harus disertai dengan category baru.',
          };

        /*
        Check if the category match the amount
        */
        if (amount && category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (
              !element ||
              !element.hasOwnProperty('name') ||
              !element.hasOwnProperty('amount')
            )
              throw {
                status: 2300,
                message:
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.',
              };

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw {
              status: 2200,
              message:
                'Total amount kategori harus sama dengan amount transaksi.',
            };
        }

        /*
        Check if the tags match the amount
        */
        if (amount && tags) {
          let tagsSum: number = 0;

          for (let i = 0; i < tags.length; i++) {
            const element = tags[i];

            if (
              !element ||
              !element.hasOwnProperty('name') ||
              !element.hasOwnProperty('amount')
            )
              throw {
                status: 2301,
                message:
                  'Tags harus dalam format {name, amount} untuk tiap tags.',
              };

            tagsSum += Number(element.amount);
          }

          if (tagsSum !== Number(amount))
            throw {
              status: 2201,
              message: 'Total amount tags harus sama dengan amount transaksi.',
            };
        }

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.eMoneyTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { eMoneyAccountId: _eMoneyAccountId } = transaction;

        const eMoneyAccountId = decodeEMoneyAccountId(_eMoneyAccountId);

        /**
         * Update balance if amount is edited
         */

        if (amount && eMoneyAccountId) {
          const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          if (!eMoneyAccount)
            throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

          const first = await prisma.eMoneyAccount.update({
            where: { id: eMoneyAccount.id },
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

          await prisma.eMoneyAccount.update({
            where: { id: eMoneyAccount.id },
            data: {
              balance: updateBalance({
                balance: first.balance,
                amount,
                direction: transaction.direction,
                reverse: false,
              }).toString(),
              lastUpdate: new Date(),
            },
          });
        }

        const response = await prisma.eMoneyTransaction.update({
          where: { id: transactionId },
          data: {
            isReviewed: true,
            amount: amount ?? transaction.amount,
            merchantId: merchantId ?? transaction.merchantId,
            category: category ?? transaction.category,
            notes: notes ?? transaction.notes,
            location: location ?? transaction.location,
            tags: tags ?? transaction.tags,
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
            transactionType: transactionType ?? transaction.transactionType,
            direction: direction ?? transaction.direction,
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        return {
          id: response.id,
          transactionName: response.transactionName,
          eMoneyAccountId: response.eMoneyAccountId,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          isReviewed: response.isReviewed,
          merchant,
          merchantId: response.merchantId,
          category: response.category as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          isHideFromBudget: response.isHideFromBudget,
          internalTransferTransactionId: response.internalTransferTransactionId,
          isHideFromInsight: response.isHideFromInsight,
        };
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

      async resolve(parent, args, context, info) {
        const { transactionId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.eMoneyTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { eMoneyAccountId: _eMoneyAccountId } = transaction;

        const eMoneyAccountId = decodeEMoneyAccountId(_eMoneyAccountId);

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount)
          throw { status: 6100, message: 'Akun e-money tidak ditemukan.' };

        /*
        Update balance
        */
        await prisma.eMoneyAccount.update({
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

        await prisma.cashTransaction.delete({ where: { id: transactionId } });

        return {
          response: `Successfully delete transaction of ${transactionId} and update balance`,
        };
      },
    });
  },
});
