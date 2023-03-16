import { decodeCashAccountId, encodeCashAccountId } from '../../../utils/auth';
import { arg, extendType, list, nonNull } from 'nexus';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';
import { toTimeStamp } from '../../../utils/date';
import { updateBalance } from '../../../utils/transaction';

export const CashAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addCashAccount', {
      type: 'CashAccount',
      description: 'Create a new cash account.',
      args: {
        accountName: nonNull(
          arg({
            type: 'String',
            description:
              'The account name of the cash account that user created. Default to "Cash"',
            default: 'Cash',
          })
        ),
        displayPicture: arg({
          type: 'String',
          description: 'The icon or display picture of that account',
        }),
        startingBalance: nonNull(
          arg({
            type: 'String',
            description: 'The starting balance of the cash account',
            default: '0',
          })
        ),
        currency: nonNull(
          arg({
            type: 'String',
            description: 'The currency of this account. Use ISO currency',
            default: 'IDR',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { accountName, displayPicture, startingBalance, currency } = args;
        const { userId: id, prisma } = context;

        if (!id) throw { status: 1100, message: 'Token tidak valid.' };

        const searchUser = await prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw { status: 1000, message: 'User tidak ditemukan.' };
        }

        /*
        Avoid same cash account name duplication
        */
        const searchCashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ accountName }, { userId: searchUser.id }] },
        });

        if (searchCashAccount)
          throw { status: 3100, message: 'Akun cash sudah ada.' };

        const response = await prisma.cashAccount.create({
          data: {
            userId: searchUser.id,
            accountName,
            displayPicture: displayPicture ?? null,
            balance: startingBalance,
            createdAt: new Date(),
            lastUpdate: new Date(),
            currency,
          },
        });

        return {
          id: response.id,
          accountName: response.accountName,
          userId: response.userId,
          balance: response.balance,
          displayPicture: response.displayPicture,
          createdAt: toTimeStamp(response.createdAt),
          lastUpdate: toTimeStamp(response.lastUpdate),
          currency: response.currency,
        };
      },
    });

    t.nonNull.field('editCashAccount', {
      type: 'CashAccount',

      description: "Edit details on user's cash account",

      args: {
        accountName: arg({
          type: 'String',
          description:
            'The account name of the cash account that user created. Default to "Cash"',
          default: 'Cash',
        }),

        displayPicture: arg({
          type: 'String',
          description: 'The icon or display picture of that account',
        }),

        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The id of that cash account',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { accountName, displayPicture, cashAccountId } = args;
        const { userId: id, prisma } = context;

        if (!displayPicture && !accountName)
          throw {
            status: 2001,
            message: 'Gambar dan nama akun tidak boleh kosong dua-duanya.',
          };

        if (!id) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const account = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
        });

        if (!account)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        const response = await prisma.cashAccount.update({
          where: { id: account.id },
          data: {
            accountName: accountName ?? account.accountName,
            displayPicture: displayPicture ?? account.displayPicture,
            lastUpdate: new Date(),
          },
        });

        return {
          id: response.id,
          userId: response.userId,
          createdAt: toTimeStamp(response.createdAt),
          accountName: response.accountName,
          displayPicture: response.displayPicture ?? null,
          balance: response.balance,
          lastUpdate: toTimeStamp(response.lastUpdate),
          currency: response.currency,
        };
      },
    });

    t.field('deleteCashAccount', {
      type: 'ResponseMessage',
      description: 'Delete cash account',

      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The cash account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { cashAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId }] },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        await prisma.cashAccount.delete({ where: { id: cashAccount.id } });

        const transaction = await prisma.cashTransaction.findMany();

        let count = 0;

        for (let i = 0; i < transaction.length; i++) {
          const element = transaction[i];

          const decodedCashAccountId = decodeCashAccountId(
            element.cashAccountId
          ) as unknown as string;

          if (decodedCashAccountId === cashAccount.id) {
            await prisma.cashTransaction.delete({ where: { id: element.id } });
            count += 1;
          }
        }

        return {
          response: `Successfully delete cash account with id ${cashAccountId} and ${count} transactions associated with that account`,
        };
      },
    });

    t.nonNull.field('reconcileCashBalance', {
      type: 'CashAccount',
      description: 'Reconcile cash balance',
      args: {
        newBalance: nonNull(
          arg({
            type: 'String',
            description: 'The new balance',
          })
        ),
        cashAccountId: nonNull(
          arg({ type: 'String', description: 'The cash account id' })
        ),
        transactionName: nonNull(
          arg({
            type: 'String',
            description: 'Transaction name',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { newBalance, cashAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        if (Number(newBalance) === Number(cashAccount.balance))
          throw {
            status: 2000,
            message:
              'Untuk reconcile, balance baru tidak boleh sama dengan balance yang sekarang.',
          };

        const response = await prisma.cashAccount.update({
          where: { id: cashAccount.id },
          data: { balance: newBalance, lastUpdate: new Date() },
        });

        const bigger = Number(newBalance) > Number(cashAccount.balance);

        const transactionAmount = bigger
          ? Number(newBalance) - Number(cashAccount.balance)
          : Number(cashAccount.balance) - Number(newBalance);

        await prisma.cashTransaction.create({
          data: {
            cashAccountId: encodeCashAccountId(cashAccount.id),
            dateTimestamp: new Date(),
            currency: cashAccount.currency,
            transactionName: 'Penyesuaian Cash',
            amount: transactionAmount.toString(),
            transactionType: 'RECONCILE',
            direction: bigger ? 'IN' : 'OUT',
            merchantId: '640ff9450ce7b9e3754d332c',
            isHideFromBudget: true,
            isHideFromInsight: true,
          },
        });

        return {
          id: response.id,
          accountName: response.accountName,
          userId: response.userId,
          balance: response.balance,
          displayPicture: response.displayPicture,
          createdAt: toTimeStamp(response.createdAt),
          lastUpdate: toTimeStamp(response.lastUpdate),
          currency: response.currency,
        };
      },
    });
  },
});

export const CashTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addCashTransaction', {
      type: 'CashTransaction',
      description: 'Add cash transaction for a particular cash account',
      args: {
        cashAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that cash account id',
          })
        ),

        currency: nonNull(
          arg({
            type: 'String',
            description:
              'The currency of this transaction, according to ISO 4217',
            default: 'IDR',
          })
        ),

        transactionName: nonNull(
          arg({
            type: 'String',
            description: 'Transaction name',
          })
        ),

        amount: nonNull(
          arg({
            type: 'String',
            description:
              'The amount for this transaction. IMPORTANT: only number and commas allowed! E.g.: 50000 for Rp 50.000, or 1002350,89 for Rp 1.002.350,89',
          })
        ),

        merchantId: nonNull(
          arg({
            type: 'String',
            description: 'The merchant id for this transaction',
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
            type: 'ExpenseTypeEnum',
            description:
              'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
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
          description: 'Additional notes for this transaction',
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
          cashAccountId: _cashAccountId,
          amount,
          merchantId,
          transactionType,
          direction,
          category,
          tags,
        } = args;

        const cashAccountId = encodeCashAccountId(_cashAccountId);

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        /*
        Check if the category match the amount
        */

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

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ userId: user.id }, { id: cashAccountId }] },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        /*
        Update balance
        */
        await prisma.cashAccount.update({
          where: { id: cashAccount.id },
          data: {
            balance: updateBalance({
              balance: cashAccount.balance,
              amount,
              direction,
              reverse: false,
            }).toString(),
            lastUpdate: new Date(),
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        const response = await prisma.cashTransaction.create({
          data: { ...args, dateTimestamp: new Date() },
        });

        return {
          id: response.id,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          cashAccountId: decodeCashAccountId(
            response.cashAccountId
          ) as unknown as string,
          currency: response.currency,
          transactionName: response.transactionName,
          amount: response.amount,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as unknown as MaybePromise<
            MaybePromise<
              | { amount: string; name: string }
              | { amount: MaybePromise<string>; name: MaybePromise<string> }
            >[]
          >,
          transactionType: response.transactionType,
          internalTransferTransactionId: response.internalTransferTransactionId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as unknown as MaybePromise<
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
      },
    });

    t.field('deleteCashTransaction', {
      type: 'ResponseMessage',
      description: 'Delete a cash transaction',
      args: {
        transactionId: nonNull(
          arg({ type: 'String', description: 'The id of the transaction' })
        ),
      },

      async resolve(parent, args, context, info) {
        const { transactionId } = args;
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.cashTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { cashAccountId: _cashAccountId } = transaction;

        const cashAccountId = decodeCashAccountId(_cashAccountId);

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { id: cashAccountId as unknown as string },
        });

        if (!cashAccount)
          throw { status: 3000, message: 'Akun cash tidak ditemukan' };

        /*
        Update balance
        */
        await prisma.cashAccount.update({
          where: { id: cashAccount.id },
          data: {
            balance: updateBalance({
              balance: cashAccount.balance,
              amount: transaction.amount,
              direction: transaction.direction,
              reverse: true,
            }).toString(),
            lastUpdate: new Date(),
          },
        });

        await prisma.cashTransaction.delete({ where: { id: transactionId } });

        return {
          response: 'Successfully delete transaction and update its balance',
        };
      },
    });

    t.nonNull.field('editCashTransaction', {
      type: 'CashTransaction',
      description: 'Edit a cash transaction',
      args: {
        transactionId: nonNull(
          arg({ type: 'String', description: 'The id of the transaction' })
        ),

        currency: arg({
          type: 'String',
          description:
            'The currency of this transaction, according to ISO 4217',
          default: 'IDR',
        }),

        transactionName: arg({
          type: 'String',
          description: 'Transaction name',
        }),

        amount: arg({
          type: 'String',
          description:
            'The amount for this transaction. IMPORTANT: only number and commas allowed! E.g.: 50000 for Rp 50.000, or 1002350,89 for Rp 1.002.350,89',
        }),

        merchantId: arg({
          type: 'String',
          description: 'The merchant id for this transaction',
        }),

        category: arg({
          type: list('NameAmountJsonInput'),
          description: 'The category of the transaction',
        }),

        transactionType: arg({
          type: 'ExpenseTypeEnum',
          description:
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
        }),

        direction: arg({
          type: 'DirectionTypeEnum',
          description: 'The direction for this transaction. `IN` or `OUT`',
        }),

        notes: arg({
          type: 'String',
          description: 'Additional notes for this transaction',
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
      },

      async resolve(parent, args, context, info) {
        const {
          transactionId,
          currency,
          amount,
          transactionName,
          merchantId,
          category,
          transactionType,
          direction,
          notes,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
        } = args;
        const { userId, prisma } = context;

        if (
          !currency &&
          !merchantId &&
          !category &&
          !transactionName &&
          !transactionType &&
          !direction &&
          !notes &&
          !location &&
          !tags &&
          !isHideFromBudget &&
          !isHideFromInsight &&
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

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.cashTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { cashAccountId: _cashAccountId } = transaction;

        const cashAccountId = decodeCashAccountId(_cashAccountId);

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

        /*
          Update balance if amount is edited
          */

        if (amount && cashAccountId) {
          const cashAccount = await prisma.cashAccount.findFirst({
            where: {
              AND: [
                { id: cashAccountId as unknown as string },
                { userId: user.id },
              ],
            },
          });

          if (!cashAccount)
            throw { status: 3000, message: 'Akun cash tidak ditemukan.' };

          const first = await prisma.cashAccount.update({
            where: { id: cashAccount.id },
            data: {
              balance: updateBalance({
                balance: cashAccount.balance,
                amount: transaction.amount,
                direction: transaction.direction,
                reverse: true,
              }).toString(),
              lastUpdate: new Date(),
            },
          });

          await prisma.cashAccount.update({
            where: { id: cashAccount.id },
            data: {
              balance: updateBalance({
                balance: first.balance,
                amount,
                direction: direction ?? transaction.direction,
                reverse: false,
              }).toString(),
              lastUpdate: new Date(),
            },
          });
        }

        const response = await prisma.cashTransaction.update({
          where: { id: transaction.id },
          data: {
            currency: currency ?? transaction.currency,
            amount: amount ?? transaction.amount,
            transactionName: transactionName ?? transaction.transactionName,
            merchantId: merchantId ?? transaction.merchantId,
            category: category ?? transaction.category,
            transactionType: transactionType ?? transaction.transactionType,
            direction: direction ?? transaction.direction,
            notes: notes ?? transaction.notes,
            location: location ?? transaction.location,
            tags: tags ?? transaction.tags,
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        return {
          id: response.id,
          cashAccountId: decodeCashAccountId(
            response.cashAccountId
          ) as unknown as string,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          currency: response.currency,
          amount: response.amount,
          transactionName: response.transactionName,
          merchant,
          merchantId: response.merchantId,
          category: response.category as unknown as MaybePromise<
            MaybePromise<
              | { amount: string; name: string }
              | { amount: MaybePromise<string>; name: MaybePromise<string> }
            >[]
          >,
          transactionType: response.transactionType,
          internalTransferTransactionId: response.internalTransferTransactionId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as MaybePromise<
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
      },
    });
  },
});
