import { decodeCashAccountId, encodeCashAccountId } from '../../../utils/auth';
import { arg, extendType, list, nonNull } from 'nexus';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';
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

      async resolve(
        __,
        { accountName, displayPicture, startingBalance, currency },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Avoid same cash account name duplication
           */
          const searchCashAccount = await prisma.cashAccount.findFirst({
            where: { AND: [{ accountName }, { userId: user.id }] },
          });

          if (searchCashAccount) throw new Error('Akun cash sudah ada.');

          const response = await prisma.cashAccount.create({
            data: {
              userId: user.id,
              accountName,
              displayPicture: displayPicture ?? null,
              balance: startingBalance,
              createdAt: new Date(),
              lastUpdate: new Date(),
              currency,
            },
          });

          return response;
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        { accountName, displayPicture, cashAccountId },
        { userId, prisma },
        ___
      ) {
        try {
          if (!displayPicture && !accountName)
            throw new Error(
              'Gambar dan nama akun tidak boleh kosong dua-duanya.'
            );

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
          });

          const response = await prisma.cashAccount.update({
            where: { id: cashAccount.id },
            data: {
              accountName: accountName ?? cashAccount.accountName,
              displayPicture: displayPicture ?? cashAccount.displayPicture,
              lastUpdate: new Date(),
            },
          });

          return response;
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { cashAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
          });

          await prisma.cashAccount.delete({ where: { id: cashAccount.id } });

          const transaction = await prisma.cashTransaction.findMany();

          let count = 0;

          for (let i = 0; i < transaction.length; i++) {
            const element = transaction[i];

            const decodedCashAccountId = decodeCashAccountId(
              element.cashAccountId
            ) as unknown as string;

            if (decodedCashAccountId === cashAccount.id) {
              await prisma.cashTransaction.delete({
                where: { id: element.id },
              });
              count += 1;
            }
          }

          return {
            response: `Successfully delete cash account with id ${cashAccountId} and ${count} transactions associated with that account`,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        { newBalance, cashAccountId },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { AND: [{ id: cashAccountId }, { userId: user.id }] },
          });

          if (Number(newBalance) === Number(cashAccount.balance))
            throw new Error(
              'Untuk reconcile, balance baru tidak boleh sama dengan balance yang sekarang.'
            );

          const response = await prisma.cashAccount.update({
            where: { id: cashAccount.id },
            data: { balance: newBalance, lastUpdate: new Date() },
          });

          const bigger = Number(newBalance) > Number(cashAccount.balance);

          const transactionAmount = bigger
            ? Number(newBalance) - Number(cashAccount.balance)
            : Number(cashAccount.balance) - Number(newBalance);

          const transaction = await prisma.cashTransaction.create({
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

          await pubsub.publish(`cashAccountUpdated_${cashAccount.id}`, {
            cashAccountUpdate: response,
          });

          await pubsub.publish(`cashTransactionLive_${cashAccount.id}`, {
            mutationType: 'ADD',
            transaction: transaction,
          });

          return response;
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        {
          cashAccountId,
          amount,
          merchantId,
          direction,
          category,
          tags,
          currency,
          transactionName,
          transactionType,
          notes,
          location,
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

          /**
           * Check if the category match the amount
           */
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

            if (tagsSum > Number(amount))
              throw new Error(
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.'
              );
          }

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { AND: [{ userId: user.id }, { id: cashAccountId }] },
          });

          /**
           * Update balance
           */
          const updatedCashAccount = await prisma.cashAccount.update({
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

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: merchantId },
          });

          const response = await prisma.cashTransaction.create({
            data: {
              cashAccountId: encodeCashAccountId(cashAccountId),
              dateTimestamp: new Date(),
              currency: currency,
              transactionName: transactionName,
              amount: amount,
              merchantId: merchantId,
              category: category,
              transactionType: transactionType,
              direction: direction,
              notes: notes,
              location: location,
              tags: tags,
              isHideFromBudget: isHideFromBudget,
              isHideFromInsight: isHideFromInsight,
            },
          });

          await pubsub.publish(`cashAccountUpdated_${cashAccount.id}`, {
            cashAccountUpdate: updatedCashAccount,
          });

          await pubsub.publish(`cashTransactionLive_${cashAccount.id}`, {
            mutationType: 'ADD',
            transaction: response,
          });

          return {
            id: response.id,
            dateTimestamp: response.dateTimestamp,
            cashAccountId: decodeCashAccountId(response.cashAccountId),
            currency: response.currency,
            transactionName: response.transactionName,
            amount: response.amount,
            merchant: merchant,
            merchantId: response.merchantId,
            category: response.category as MaybePromise<
              { amount: string; name: string }[] | null | undefined
            >,
            transactionType: response.transactionType,
            internalTransferTransactionId:
              response.internalTransferTransactionId,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as MaybePromise<
              { amount: string; name: string }[] | null | undefined
            >,
            isHideFromBudget: response.isHideFromBudget,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { transactionId }, { userId, prisma, pubsub }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const transaction = await prisma.cashTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          const { cashAccountId: _cashAccountId } = transaction;

          const cashAccountId = decodeCashAccountId(_cashAccountId);

          const cashAccount = await prisma.cashAccount.findFirstOrThrow({
            where: { id: cashAccountId as unknown as string },
          });

          /**
           * Update balance
           */
          const updatedCashAccount = await prisma.cashAccount.update({
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

          const deletedTransaction = await prisma.cashTransaction.delete({
            where: { id: transactionId },
          });

          await pubsub.publish(`cashAccountUpdated_${cashAccount.id}`, {
            cashAccountUpdate: updatedCashAccount,
          });

          await pubsub.publish(`cashTransactionLive_${cashAccount.id}`, {
            mutationType: 'DELETE',
            transaction: deletedTransaction,
          });

          return {
            response: 'Successfully delete transaction and update its balance',
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        {
          transactionId,
          currency,
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
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
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
            !isHideFromInsight
          )
            throw new Error('Semua value tidak boleh null atau undefined.');

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const transaction = await prisma.cashTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          const { cashAccountId: _cashAccountId } = transaction;

          const cashAccountId = decodeCashAccountId(_cashAccountId);

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

            if (tagsSum > Number(transaction.amount))
              throw new Error(
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.'
              );
          }

          const response = await prisma.cashTransaction.update({
            where: { id: transaction.id },
            data: {
              currency: currency ?? transaction.currency,
              transactionName: transactionName ?? transaction.transactionName,
              merchantId: merchantId ?? transaction.merchantId,
              category: category ?? transaction.category,
              transactionType: transactionType ?? transaction.transactionType,
              direction: direction ?? transaction.direction,
              notes: notes ?? transaction.notes,
              location: location ?? transaction.location,
              tags: tags ?? transaction.tags,
              isHideFromBudget:
                isHideFromBudget ?? transaction.isHideFromBudget,
              isHideFromInsight:
                isHideFromInsight ?? transaction.isHideFromInsight,
            },
          });

          await pubsub.publish(`cashTransactionLive_${cashAccountId}`, {
            mutationType: 'EDIT',
            transaction: response,
          });

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            cashAccountId: decodeCashAccountId(
              response.cashAccountId
            ) as unknown as string,
            dateTimestamp: response.dateTimestamp,
            currency: response.currency,
            amount: response.amount,
            transactionName: response.transactionName,
            merchant,
            merchantId: response.merchantId,
            category: response.category as MaybePromise<
              { amount: string; name: string }[] | null | undefined
            >,
            transactionType: response.transactionType,
            internalTransferTransactionId:
              response.internalTransferTransactionId,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as MaybePromise<
              { amount: string; name: string }[] | null | undefined
            >,
            isHideFromBudget: response.isHideFromBudget,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
