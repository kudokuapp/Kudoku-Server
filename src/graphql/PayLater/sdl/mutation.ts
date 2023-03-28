import { decodePayLaterAccountId } from '../../../utils/auth/payLaterAccountId';
import { arg, extendType, list, nonNull } from 'nexus';

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
  },
});
