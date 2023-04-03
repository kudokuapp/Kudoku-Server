import {
  decodePayLaterAccountId,
  encodePayLaterAccountId,
} from '../../../utils/auth';
import { arg, extendType, list, nonNull } from 'nexus';
import moment from 'moment';
import { DirectionType, TransactionType } from '@prisma/client';
import _ from 'lodash';
import { findBrickTransactionIndex } from '../../../utils/transaction';

export const PayLaterAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('connectGopayPayLaterViaKudokuxBrick', {
      type: 'PayLaterAccount',

      description: 'Connect Gopay paylater after running KudokuxBrick API.',

      args: {
        account: nonNull(
          arg({
            type: 'KudokuxBrickAccount',
            description: 'The account after running KudokuxBrick API.',
          })
        ),

        transaction: list(
          nonNull(
            arg({
              type: 'KudokuxBrickTransaction',
              description: 'The transaction after running KudokuxBrick API.',
            })
          )
        ),
      },

      resolve: async (
        __,
        { account, transaction },
        { userId, prisma },
        ____
      ) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Avoid same pay later account duplication
           */
          const searchPayLaterAccount = await prisma.payLaterAccount.findFirst({
            where: {
              AND: [
                { accountNumber: account.accountNumber },
                { userId: user.id },
              ],
            },
          });

          if (searchPayLaterAccount)
            throw new Error('Akun pay later sudah ada.');

          const payLaterAccount = await prisma.payLaterAccount.create({
            data: {
              userId: user.id,
              institutionId: '63d94170d3e050940af0caf2',
              accountNumber: account.accountNumber,
              accessToken: account.accessToken ?? '',
              balance: `${account.balances.available}`,
              limit: `${account.balances.limit}`,
              createdAt: new Date(),
              lastUpdate: new Date(),
              currency: account.currency,
              expired: false,
            },
          });

          if (transaction) {
            for (let i = 0; i < transaction.length; i++) {
              const element = transaction[i];

              const obj = {
                payLaterAccountId: encodePayLaterAccountId(payLaterAccount.id),
                transactionName: element.description,
                dateTimestamp: new Date(
                  moment(element.dateTimestamp).add(1, 'day') as unknown as Date
                ),
                referenceId: element.reference_id,
                currency: element.account_currency,
                amount: `${element.amount}`,
                onlineTransaction: false,
                isReviewed: false,
                merchantId: '63d8b775d3e050940af0caf1',
                category: [{ name: 'UNDEFINED', amount: `${element.amount}` }],
                transactionType: (element.direction === 'in'
                  ? 'INCOME'
                  : 'EXPENSE') as TransactionType,
                direction: (element.direction === 'in'
                  ? 'IN'
                  : 'OUT') as DirectionType,
                isSubscription: false,
                description: element.description,
                institutionId: '641300b21465d712b0207f9c',
                isHideFromBudget: false,
                isHideFromInsight: false,
              };

              await prisma.payLaterTransaction.create({ data: obj });
            }
          }

          return {
            id: payLaterAccount.id,
            userId: payLaterAccount.userId,
            createdAt: payLaterAccount.createdAt,
            lastUpdate: payLaterAccount.lastUpdate,
            balance: payLaterAccount.balance,
            limit: payLaterAccount.limit,
            currency: payLaterAccount.currency,
            institutionId: payLaterAccount.institutionId,
            accountNumber: payLaterAccount.accountNumber,
            expired: payLaterAccount.expired,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('updatePayLaterAccountExpiry', {
      type: 'ResponseMessage',

      description: 'Update pay later account expired property.',

      args: {
        payLaterAccountId: nonNull(
          arg({ type: 'String', description: 'The payLaterAccountId' })
        ),

        expired: nonNull(
          arg({
            type: 'Boolean',
            description: 'If expired `true` if not `false`',
          })
        ),
      },

      resolve: async (
        __,
        { payLaterAccountId, expired },
        { userId, prisma, pubsub },
        ___
      ) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccountSearch =
            await prisma.payLaterAccount.findFirstOrThrow({
              where: { AND: [{ id: payLaterAccountId }, { userId: user.id }] },
            });

          const payLaterAccount = await prisma.payLaterAccount.update({
            where: { id: payLaterAccountSearch.id },
            data: { expired, lastUpdate: new Date() },
          });

          await pubsub.publish(`payLaterAccountUpdated_${payLaterAccount.id}`, {
            payLaterAccountUpdate: payLaterAccount,
          });

          return {
            response: `Successfully update expired property in ${payLaterAccount.id}`,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const PayLaterTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('editPayLaterTransaction', {
      type: 'PayLaterTransaction',
      description: 'Edit a particular pay later transaction',
      args: {
        transactionId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that transaction',
          })
        ),

        transactionName: arg({
          type: 'String',
          description: 'The transaction name',
        }),

        onlineTransaction: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is online',
        }),

        merchantId: arg({
          type: 'String',
          description: 'The merchant id',
        }),

        category: arg({
          type: list('NameAmountJsonInput'),
          description: 'The category of the transaction',
        }),

        transactionType: arg({
          type: 'ExpenseTypeEnum',
          description:
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction.',
        }),

        isSubscription: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is a subscription',
        }),

        notes: arg({
          type: 'String',
          description: 'Notes for this transaction',
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

      async resolve(
        __,
        {
          transactionId,
          onlineTransaction,
          merchantId,
          category,
          transactionType,
          transactionName,
          isSubscription,
          notes,
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

          if (
            !onlineTransaction &&
            !merchantId &&
            !category &&
            !transactionName &&
            !transactionType &&
            !isSubscription &&
            !notes &&
            !location &&
            !tags &&
            !isHideFromBudget &&
            !isHideFromInsight
          )
            throw new Error('Semua value tidak boleh null atau undefined.');

          const transaction = await prisma.payLaterTransaction.findFirstOrThrow(
            {
              where: { id: transactionId },
            }
          );

          const { amount, payLaterAccountId: _payLaterAccountId } = transaction;

          const payLaterAccountId = decodePayLaterAccountId(_payLaterAccountId);

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

          const response = await prisma.payLaterTransaction.update({
            where: { id: transaction.id },
            data: {
              onlineTransaction:
                onlineTransaction ?? transaction.onlineTransaction,
              transactionName: transactionName ?? transaction.transactionName,
              merchantId: merchantId ?? transaction.merchantId,
              category: category ?? transaction.category,
              transactionType: transactionType ?? transaction.transactionType,
              isSubscription: isSubscription ?? transaction.isSubscription,
              notes: notes ?? transaction.notes,
              location: location ?? transaction.location,
              tags: tags ?? transaction.tags,
              isHideFromBudget:
                isHideFromBudget ?? transaction.isHideFromBudget,
              isHideFromInsight:
                isHideFromInsight ?? transaction.isHideFromInsight,
              isReviewed: true,
            },
          });

          await pubsub.publish(`payLaterTransactionLive_${payLaterAccountId}`, {
            mutationType: 'EDIT',
            transaction: response,
          });

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            transactionName: response.transactionName,
            payLaterAccountId,
            dateTimestamp: response.dateTimestamp,
            referenceId: response.referenceId,
            institutionId: response.institutionId,
            currency: response.currency,
            amount: response.amount,
            onlineTransaction: response.onlineTransaction,
            isReviewed: response.isReviewed,
            merchant: merchant,
            merchantId: response.merchantId,
            category: response.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            transactionType: response.transactionType,
            description: response.description,
            internalTransferTransactionId:
              response.internalTransferTransactionId,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isSubscription: response.isSubscription,
            isHideFromBudget: response.isHideFromBudget,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('refreshGopayPayLaterViaKudokuxBrick', {
      type: 'PayLaterTransaction',

      description:
        'A form of refreshing pay later account database using data that has been received by running KudokuxBrick.',

      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The pay later account id.',
          })
        ),

        transactionReferenceId: nonNull(
          arg({
            type: 'String',
            description:
              'The transaction reference Id after running query `getPayLaterLatestTransaction`',
          })
        ),

        account: nonNull(
          arg({
            type: 'KudokuxBrickAccount',
            description: 'The account from KudokuxBrick',
          })
        ),

        transaction: nonNull(
          list(
            nonNull(
              arg({
                type: 'KudokuxBrickTransaction',
                description: 'The transaction from KudokuxBrick',
              })
            )
          )
        ),
      },

      resolve: async (
        __,
        { account, transaction, payLaterAccountId, transactionReferenceId },
        { userId, prisma, pubsub },
        ___
      ) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const payLaterAccountSearch =
            await prisma.payLaterAccount.findFirstOrThrow({
              where: { AND: [{ id: payLaterAccountId }, { userId: user.id }] },
            });

          const payLaterAccount = await prisma.payLaterAccount.update({
            where: { id: payLaterAccountSearch.id },
            data: {
              balance: `${account.balances.available}`,
              limit: `${account.balances.limit}`,
              lastUpdate: new Date(),
            },
          });

          await pubsub.publish(`payLaterAccountUpdated_${payLaterAccount.id}`, {
            payLaterAccountUpdate: payLaterAccount,
          });

          const sortedTransaction = _.sortBy(transaction, [
            'dateTimestamp',
            'reference_id',
          ]);

          const transactionData = sortedTransaction as BrickTransactionData[];

          const index = findBrickTransactionIndex(
            transactionReferenceId,
            transactionData
          );

          const newTransaction = transactionData.splice(
            index + 1,
            transactionData.length
          );

          if (newTransaction.length === 0)
            throw new Error(
              'Tidak ada transaksi baru untuk pay later akun tersebut.'
            );

          let responseToIterate: any[] = [];

          for (let i = 0; i < newTransaction.length; i++) {
            const element = newTransaction[i];

            const obj = {
              payLaterAccountId: encodePayLaterAccountId(payLaterAccount.id),
              transactionName: element.description,
              dateTimestamp: new Date(
                moment(element.dateTimestamp).add(1, 'day') as unknown as Date
              ),
              referenceId: element.reference_id,
              currency: element.account_currency,
              amount: `${element.amount}`,
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [{ name: 'UNDEFINED', amount: `${element.amount}` }],
              transactionType: (element.direction === 'in'
                ? 'INCOME'
                : 'EXPENSE') as TransactionType,
              direction: (element.direction === 'in'
                ? 'IN'
                : 'OUT') as DirectionType,
              isSubscription: false,
              description: element.description,
              institutionId: '63d94170d3e050940af0caf2',
              isHideFromBudget: false,
              isHideFromInsight: false,
            };

            const trans = await prisma.payLaterTransaction.create({
              data: obj,
            });

            await pubsub.publish(
              `payLaterTransactionLive_${payLaterAccount.id}`,
              {
                mutationType: 'ADD',
                transaction: trans,
              }
            );

            responseToIterate.push(trans);
          }

          if (responseToIterate.length === 0) {
            return null;
          } else {
            const response = await Promise.all(
              responseToIterate.map(async (v) => {
                const merchant = await prisma.merchant.findFirstOrThrow({
                  where: { id: v.merchantId },
                });
                return {
                  id: v.id,
                  transactionName: v.transactionName,
                  payLaterAccountId: decodePayLaterAccountId(
                    v.payLaterAccountId
                  ),
                  dateTimestamp: v.dateTimestamp,
                  currency: v.currency,
                  amount: v.amount,
                  merchant: merchant,
                  merchantId: v.merchantId,
                  category: v.category,
                  direction: v.direction,
                  transactionType: v.transactionType,
                  internalTransferTransactionId:
                    v.internalTransferTransactionId,
                  notes: v.notes,
                  location: v.location,
                  tags: v.tags,
                  isHideFromBudget: v.isHideFromBudget,
                  isHideFromInsight: v.isHideFromInsight,
                  description: v.description,
                  institutionId: v.institutionId,
                  referenceId: v.referenceId,
                  onlineTransaction: v.onlineTransaction,
                  isReviewed: v.isReviewed,
                  isSubscription: v.isSubscription,
                };
              })
            );
            return response as any;
          }
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
