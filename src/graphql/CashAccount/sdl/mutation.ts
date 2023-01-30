import { arg, enumType, extendType, list, nonNull } from 'nexus';
import { NexusObjectTypeDef } from 'nexus/dist/definitions/objectType';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';
import { toTimeStamp } from '../../../utils/date';
import { updateBalance } from '../../../utils/transaction';
import { CategoryInputType } from './type';

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
          where: { AND: [{ accountName }, { userId: id }] },
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

        id: nonNull(
          arg({
            type: 'String',
            description: 'The id of that cash account',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { accountName, displayPicture, id: cashId } = args;
        const { userId: id, prisma } = context;

        if (!displayPicture && !accountName)
          throw new Error('Cannot have displayPicture and accountName null');

        if (!id) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('Cannot find user');

        const account = await prisma.cashAccount.findFirst({
          where: { id: cashId },
        });

        if (!account)
          throw new Error('Cannot find the cash account of that id');

        if (accountName !== null && accountName !== undefined) {
          await prisma.cashAccount.update({
            where: { id: cashId },
            data: { accountName },
          });
        }

        if (displayPicture !== null && displayPicture !== undefined) {
          await prisma.cashAccount.update({
            where: { id: cashId },
            data: { displayPicture },
          });
        }

        const response = await prisma.cashAccount.findFirst({
          where: { id: cashId },
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
        id: nonNull(
          arg({
            type: 'String',
            description: 'The cash account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { id: cashAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const cashAccount = await prisma.cashAccount.findFirst({
          where: { id: cashAccountId },
        });

        if (!cashAccount) throw new Error('Cannot find that cash account');

        await prisma.cashAccount.delete({ where: { id: cashAccountId } });

        return {
          response: `Successfully delete cash account with id ${cashAccountId}`,
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
        merchantId: nonNull(
          arg({
            type: 'String',
            description: 'The merchant id for this transaction',
          })
        ),

        category: nonNull(
          arg({
            type: list(CategoryInputType),
            description: 'The category of the transaction',
          })
        ),

        transactionType: nonNull(
          arg({
            type: ExpenseTypeEnum,
            description:
              'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
          })
        ),

        direction: nonNull(
          arg({
            type: DirectionTypeEnum,
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
          where: { id: cashAccountId },
        });

        if (!cashAccount)
          throw new Error('Cannot find the associated cash account');

        /*
        Update balance
        */
        await prisma.cashAccount.update({
          where: { id: cashAccountId },
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

        if (!merchant) throw new Error('Cannot find merchant');

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
          merchantId: response.merchantId ?? '',
          category: response.category as unknown as MaybePromise<
            MaybePromise<{ amount: string; name: string } | null>[]
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
        id: nonNull(
          arg({ type: 'String', description: 'The id of the transaction' })
        ),
      },

      async resolve(parent, args, context, info) {
        const { id: transactionId } = args;
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

        if (!cashAccount) throw new Error('Cannot find the cast account');

        /*
        Update balance
        */
        await prisma.cashAccount.update({
          where: { id: cashAccountId },
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

    t.field('reconcileCashBalance', {
      type: 'ResponseMessage',
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
          where: { id: cashAccountId },
        });

        if (!cashAccount) throw new Error('Cannot find that cash account');

        if (Number(newBalance) === Number(cashAccount.balance))
          throw new Error(
            'New balance cannot be the same as the current balance'
          );

        await prisma.cashAccount.update({
          where: { id: cashAccountId },
          data: { balance: newBalance },
        });

        const bigger = Number(newBalance) > Number(cashAccount.balance);

        const transactionAmount = bigger
          ? Number(newBalance) - Number(cashAccount.balance)
          : Number(cashAccount.balance) - Number(newBalance);

        await prisma.cashTransaction.create({
          data: {
            cashAccountId,
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
          response: `Successfully reconcile. The new balance for the account id ${cashAccountId} is ${newBalance}`,
        };
      },
    });
  },
});

export const ExpenseTypeEnum = enumType({
  name: 'ExpenseTypeEnum',
  members: ['INCOME', 'EXPENSE', 'TRANSFER', 'RECONCILE'],
});

export const DirectionTypeEnum = enumType({
  name: 'DirectionTypeEnum',
  members: ['IN', 'OUT'],
});
