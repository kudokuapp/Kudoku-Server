import { objectType } from 'nexus';

export const EMoneyAccount = objectType({
  name: 'EMoneyAccount',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('userId');

    t.nonNull.string('institutionId');

    t.nonNull.string('cardNumber');

    t.nonNull.string('createdAt', {
      description: 'When this account is created',
    });

    t.nonNull.string('lastUpdate', {
      description: 'When this account is last updated',
    });

    t.nonNull.string('balance', {
      description: 'The balance of that cash account',
    });

    t.nonNull.string('currency', {
      description: 'The ISO currency of this account',
    });
  },
});

export const EMoneyTransaction = objectType({
  name: 'EMoneyTransaction',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('eMoneyAccountId', {
      description: 'The E-Wallet account Id',
    });

    t.nonNull.string('dateTimestamp', {
      description: 'Date and Timestamp for this transaction',
    });

    t.nonNull.string('referenceId', {
      description:
        'The reference id. The reference id is to check on what number is the transaction for the day',
    });

    t.nonNull.string('institutionId', {
      description: 'The institution id',
    });

    t.nonNull.string('currency', {
      description: 'ISO 4217 Currency',
    });

    t.nonNull.string('amount', {
      description: 'The transaction amount',
    });

    t.nonNull.boolean('isReviewed', {
      description:
        'Whether or not this transaction is reviewed by the user on the client',
    });

    t.field('merchant', {
      type: 'Merchant',
      description: 'The merchant',
    });

    t.string('merchantId', {
      description: 'The merchant Id',
    });

    t.list.field('category', {
      type: 'Category',
      description: 'The category for this transaction',
    });

    t.nonNull.string('transactionType', {
      description:
        "The transaction type for this transaction. It's either `INCOME`, or `EXPENSE`.",
    });

    t.string('description', {
      description: 'The description given by the Banks API',
    });

    t.nonNull.string('direction', {
      description:
        "The direction of the transaction. It's either `IN`, or `OUT`",
    });

    t.string('notes', {
      description: 'Additional notes for this transaction',
    });

    t.field('location', {
      type: 'Location',
      description: 'The location of the transaction',
    });

    t.list.string('tags', {
      description: 'Additional tags for this transaction',
    });

    t.nonNull.boolean('isHideFromBudget', {
      description: 'Whether or not this transaction is hidden from budget',
    });

    t.nonNull.boolean('isHideFromInsight', {
      description: 'Whether or not this transaction is hidden from insight',
    });

    t.nonNull.string('transactionMethod', {
      description: 'The transaction method. `Virtual Account`, `Debit`',
    });
  },
});
