import { arg, extendType, list, nonNull } from 'nexus';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';
import { toTimeStamp } from '../../../utils/date';
import { updateBalance } from '../../../utils/transaction';
import { Merchant } from '@prisma/client';

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

        if (!id) throw new Error('Invalid token');

        const searchUser = await prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw new Error('User does not exist');
        }

        /*
        Avoid same cash account name duplication
        */
        const searchCashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ accountName }, { userId: searchUser.id }] },
        });

        if (searchCashAccount)
          throw new Error('The same account has already been created');

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
          throw new Error(
            'Cannot have displayPicture and accountName both null'
          );

        if (!id) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('Cannot find user');

        const account = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
        });

        if (!account)
          throw new Error('Cannot find the cash account of that id');

        const response = await prisma.cashAccount.update({
          where: { id: account.id },
          data: {
            accountName: accountName ?? account.accountName,
            displayPicture: displayPicture ?? account.displayPicture,
            lastUpdate: new Date(),
          },
        });

        if (!response)
          throw new Error('Somehow cannot find the updated response');

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

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId }] },
        });

        if (!cashAccount) throw new Error('Cannot find that cash account');

        await prisma.cashAccount.delete({ where: { id: cashAccount.id } });

        const deletedTransaction = await prisma.cashTransaction.deleteMany({
          where: { cashAccountId: cashAccount.id },
        });

        return {
          response: `Successfully delete cash account with id ${cashAccountId} and ${deletedTransaction.count} transactions associated with that account`,
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
      },

      async resolve(parent, args, context, info) {
        const { newBalance, cashAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
        });

        if (!cashAccount) throw new Error('Cannot find that cash account');

        if (Number(newBalance) === Number(cashAccount.balance))
          throw new Error(
            'New balance cannot be the same as the current balance'
          );

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
            cashAccountId: cashAccount.id,
            dateTimestamp: new Date(),
            currency: cashAccount.currency,
            amount: transactionAmount.toString(),
            transactionType: 'RECONCILE',
            direction: bigger ? 'IN' : 'OUT',
            tags: [],
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

        amount: nonNull(
          arg({
            type: 'String',
            description:
              'The amount for this transaction. IMPORTANT: only number and commas allowed! E.g.: 50000 for Rp 50.000, or 1002350,89 for Rp 1.002.350,89',
          })
        ),

        merchantId: arg({
          type: 'String',
          description: 'The merchant id for this transaction',
        }),

        category: nonNull(
          arg({
            type: list('CategoryInputType'),
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

        internalTransferAccountId: arg({
          type: 'String',
          description: 'The account id if internal transfer',
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
          type: nonNull(list(nonNull('String'))),
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

      async resolve(parent, args, context) {
        const {
          cashAccountId,
          amount,
          merchantId,
          transactionType,
          direction,
          internalTransferAccountId,
          category,
        } = args;

        if (transactionType === 'TRANSFER' && !internalTransferAccountId)
          throw new Error(
            'Internal transfer account ID is required for Internal Transfer transaction'
          );

        if (
          transactionType !== 'TRANSFER' &&
          internalTransferAccountId !== null &&
          internalTransferAccountId !== undefined
        )
          throw new Error(
            "It seems like you've put internalTransferAccountId even though it's not a `TRANSFER` type. This must be a mistake."
          );

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        /*
        Check if the category match the amount
        */

        let categorySum: number = 0;

        for (let i = 0; i < category.length; i++) {
          const element = category[i];

          if (!element) throw new Error('Object is null');

          categorySum += Number(element.amount);
        }

        if (categorySum !== Number(amount))
          throw new Error(
            'The amount sum of categories need to be the same with the amount given'
          );

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ userId: user.id }, { id: cashAccountId }] },
        });

        if (!cashAccount)
          throw new Error('Cannot find the associated cash account');

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

        let merchant: Merchant | null = null;

        if (merchantId) {
          merchant = await prisma.merchant.findFirst({
            where: { id: merchantId },
          });
        }

        const response = await prisma.cashTransaction.create({
          data: { ...args, dateTimestamp: new Date() },
        });

        return {
          id: response.id,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          cashAccountId: response.cashAccountId,
          currency: response.currency,
          amount: response.amount,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as unknown as MaybePromise<
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          transactionType: response.transactionType,
          internalTransferAccountId: response.internalTransferAccountId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags,
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

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const transaction = await prisma.cashTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw new Error('Cannot find the transaction based on that id');

        const { cashAccountId } = transaction;

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { id: cashAccountId },
        });

        if (!cashAccount) throw new Error('Cannot find the cash account');

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
          type: list(CategoryInputType),
          description: 'The category of the transaction',
        }),

        transactionType: arg({
          type: ExpenseTypeEnum,
          description:
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
        }),

        direction: arg({
          type: DirectionTypeEnum,
          description: 'The direction for this transaction. `IN` or `OUT`',
        }),

        internalTransferAccountId: arg({
          type: 'String',
          description: 'The account id if internal transfer',
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
          type: list(nonNull('String')),
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
          merchantId,
          category,
          transactionType,
          direction,
          internalTransferAccountId,
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
          !transactionType &&
          !direction &&
          !internalTransferAccountId &&
          !notes &&
          !location &&
          !tags &&
          !isHideFromBudget &&
          !isHideFromInsight &&
          !amount
        )
          throw new Error('Cannot have all value null');

        if (amount && !category)
          throw new Error(
            'Please put the new category if you want to edit the amount'
          );

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const transaction = await prisma.cashTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw new Error('Cannot find the transaction based on that id');

        const { cashAccountId } = transaction;

        if (
          (transactionType === 'EXPENSE' ||
            transaction.transactionType === 'EXPENSE') &&
          !merchantId
        )
          throw new Error(
            'Please insert merchant id if the transaction type is not income'
          );

        /*
        Check if the category match the amount
        */
        if (amount && category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (!element) throw new Error('Object is null');

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw new Error(
              'The amount sum of categories need to be the same with the amount given'
            );
        }

        /*
          Update balance if amount is edited
          */

        if (amount && cashAccountId) {
          const cashAccount = await prisma.cashAccount.findFirst({
            where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
          });

          if (!cashAccount) throw new Error('Cannot find cash account');

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
            merchantId: merchantId ?? transaction.merchantId,
            category: category ?? transaction.category,
            transactionType: transactionType ?? transaction.transactionType,
            direction: direction ?? transaction.direction,
            internalTransferAccountId:
              internalTransferAccountId ??
              transaction.internalTransferAccountId,
            notes: notes ?? transaction.notes,
            location: location ?? transaction.location,
            tags: tags ?? transaction.tags,
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
          },
        });

        let merchant: Merchant | null = null;

        if (response.merchantId) {
          merchant = await prisma.merchant.findFirst({
            where: { id: response.merchantId },
          });
        }

        return {
          id: response.id,
          cashAccountId: response.cashAccountId,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          currency: response.currency,
          amount: response.amount,
          merchant,
          merchantId: response.merchantId,
          category: response.category as MaybePromise<
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          transactionType: response.transactionType,
          internalTransferAccountId: response.internalTransferAccountId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
      },
    });
  },
});
