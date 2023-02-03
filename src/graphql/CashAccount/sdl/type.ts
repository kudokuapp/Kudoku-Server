import { inputObjectType, objectType } from 'nexus';

export const CashAccount = objectType({
  name: 'CashAccount',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('userId');

    t.nonNull.string('createdAt', {
      description: 'When this account is created',
    });

    t.nonNull.string('lastUpdate', {
      description: 'When this account is last updated',
    });

    t.nonNull.string('accountName', {
      description:
        'Name, should user choose it\'s name differently. Default should be just "Cash"',
    });

    t.string('displayPicture', { description: 'base64 image' });

    t.nonNull.string('balance', {
      description: 'The balance of that cash account',
    });

    t.nonNull.string('currency', {
      description: 'The ISO currency of this account',
    });
  },
});

export const CashTransaction = objectType({
  name: 'CashTransaction',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('cashAccountId', {
      description: 'The cash account Id',
    });

    t.nonNull.string('dateTimestamp', {
      description: 'Date and Timestamp for this transaction',
    });

    t.nonNull.string('currency', {
      description: 'ISO 4217 Currency',
    });

    t.nonNull.string('amount', {
      description: 'The transaction amount',
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
        "The transaction type for this transaction. It's either `INCOME`, `EXPENSE`, or `TRANSFER`",
    });

    t.string('internalTransferAccountId', {
      description: 'The account id for internal transfer',
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
  },
});

export const Location = objectType({
  name: 'Location',
  definition(t) {
    t.nonNull.string('latitude');
    t.nonNull.string('longitude');
  },
});

export const Category = objectType({
  name: 'Category',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('amount');
  },
});

export const LocationInputType = inputObjectType({
  name: 'LocationInputType',
  definition(t) {
    t.nonNull.string('latitude');
    t.nonNull.string('longitude');
  },
});

export const CategoryInputType = inputObjectType({
  name: 'CategoryInputType',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('amount');
  },
});