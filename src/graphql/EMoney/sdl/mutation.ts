import { arg, extendType, nonNull, list } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { TransactionTypeNoTransfer } from '@prisma/client';
import _ from 'lodash';
import { CategoryInputType } from '../../CashAccount/sdl/type';
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
  },
});

export const EMoneyTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addEMoneyTransaction', {
      type: 'EMoneyTransaction',
      description:
        'Update transaction and balance for a particular e-wallet account',

      args: {
        eMoneyAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that e-money account id',
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
              "The transaction type. It's either `INCOME` or `EXPENSE`",
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
          currency,
          amount,
          merchantId,
          category,
          transactionType,
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

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        const eMoneyAccount = await prisma.eMoneyAccount.findFirst({
          where: { id: eMoneyAccountId },
        });

        if (!eMoneyAccount) throw new Error('Cannot find the e-money account');

        const response = await prisma.eMoneyTransaction.create({
          data: {
            dateTimestamp: new Date(),
            isReviewed: true,
            eMoneyAccountId,
            currency,
            amount,
            merchantId,
            category,
            transactionType: transactionType as TransactionTypeNoTransfer,
            notes,
            description,
            institutionId,
            location,
            tags,
            isHideFromBudget,
            isHideFromInsight,
            direction: transactionType === 'INCOME' ? 'IN' : 'OUT',
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
              amount,
              direction: transactionType === 'INCOME' ? 'IN' : 'OUT',
              reverse: false,
            }).toString(),
            lastUpdate: new Date(),
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId ?? '63d3be20009767d5eb7e7410' },
        });

        return {
          id: response.id,
          eMoneyAccountId: response.eMoneyAccountId,
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          isReviewed: response.isReviewed,
          merchant: merchant ?? null,
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
  },
});
