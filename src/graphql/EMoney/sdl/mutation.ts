import { arg, extendType, nonNull, list, enumType } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { Merchant, TransactionType } from '@prisma/client';
import { DirectionTypeEnum } from '../../Enum';
import _ from 'lodash';
import { CategoryInputType } from '../../ObjectType';
import { updateBalance } from '../../../utils/transaction';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';

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
            description: 'sessionId after running `sendOtpGopayViaBrick` query',
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

        if (!userId) throw new Error('Invalid token');

        const searchUser = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!searchUser) {
          throw new Error('User does not exist');
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
          throw new Error('Account already exist with that card number');

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

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount) throw new Error('Cannot find that e-money account');

        if (Number(newBalance) === Number(eMoneyAccount.balance))
          throw new Error(
            'New balance cannot be the same as the current balance'
          );

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
            eMoneyAccountId,
            transactionName: 'RECONCILE',
            dateTimestamp: new Date(),
            currency: eMoneyAccount.currency,
            amount: transactionAmount.toString(),
            transactionType: 'RECONCILE',
            direction: bigger ? 'IN' : 'OUT',
            tags: [],
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
  },
});

export const EMoneyTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addEMoneyTransaction', {
      type: 'EMoneyTransaction',
      description:
        'Update transaction and balance for a particular e-money account',

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
            type: list(CategoryInputType),
            description: 'The category of the transaction',
          })
        ),

        transactionType: nonNull(
          arg({
            type: 'String',
            description:
              "The transaction type. It's either `INCOME`, `EXPENSE`, or `INTERNAL TRANSFER`",
          })
        ),

        direction: nonNull(
          arg({
            type: DirectionTypeEnum,
            description: 'The direction for this transaction. `IN` or `OUT`',
          })
        ),

        internalTransferTransactionId: arg({
          type: 'String',
          description: 'The account id if internal transfer',
        }),

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
          internalTransferTransactionId,
          notes,
          description,
          institutionId,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
        } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        if (
          transactionType !== 'TRANSFER' &&
          internalTransferTransactionId !== null &&
          internalTransferTransactionId !== undefined
        )
          throw new Error(
            "It seems like you've put internalTransferAccountId even though it's not a `TRANSFER` type. This must be a mistake."
          );

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount) throw new Error('Cannot find the e-money account');

        const response = await prisma.eMoneyTransaction.create({
          data: {
            transactionName,
            internalTransferTransactionId,
            dateTimestamp: new Date(),
            isReviewed: true,
            eMoneyAccountId: eMoneyAccount.id,
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

        let merchant: Merchant | null = null;

        if (response.merchantId) {
          merchant = await prisma.merchant.findFirst({
            where: { id: response.merchantId },
          });
        }

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
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags,
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
          type: list(CategoryInputType),
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

        transactionType: arg({
          type: 'ExpenseTypeNoTransferEnum',
          description:
            'The transaction type. Either INCOME for in transation, and EXPENSE for outgoing transaction',
        }),

        direction: arg({
          type: DirectionTypeEnum,
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
          !transactionType
        )
          throw new Error('Cannot have all value null');

        if (amount && !category)
          throw new Error('Please insert new category when editing amount');

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

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const transaction = await prisma.eMoneyTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw new Error('Cannot find the transaction based on that id');

        const { eMoneyAccountId } = transaction;

        if (
          (transactionType === 'EXPENSE' ||
            transaction.transactionType === 'EXPENSE') &&
          !merchantId
        )
          throw new Error(
            'Please insert merchant id if the transaction type is not income'
          );

        /**
         * Update balance if amount is edited
         */

        if (amount && eMoneyAccountId) {
          const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
            where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
          });

          if (!eMoneyAccount) throw new Error('Cannot find e-money account');

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

        let merchant: Merchant | null = null;

        if (response.merchantId) {
          merchant = await prisma.merchant.findFirst({
            where: { id: response.merchantId },
          });
        }

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
            ({ amount: string; name: string } | null)[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags,
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

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const transaction = await prisma.eMoneyTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw new Error('Cannot find the transaction based on that id');

        const { eMoneyAccountId } = transaction;

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { AND: [{ id: eMoneyAccountId }, { userId: user.id }] },
        });

        if (!eMoneyAccount) throw new Error('Cannot find the e-money account');

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
