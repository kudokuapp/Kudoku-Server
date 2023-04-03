import { objectType } from 'nexus';

export const DebitAccount = objectType({
  name: 'DebitAccount',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('userId');

    t.nonNull.string('institutionId');

    t.nonNull.string('accountNumber');

    t.nonNull.dateTime('createdAt', {
      description: 'When this account is created',
    });

    t.nonNull.dateTime('lastUpdate', {
      description: 'When this account is last updated',
    });

    t.nonNull.string('balance', {
      description: 'The balance of that cash account',
    });

    t.nonNull.string('currency', {
      description: 'The ISO currency of this account',
    });

    t.nonNull.boolean('expired', {
      description: 'Wether or not this debit account access token is expired',
    });

    t.string('brickAccessToken', {
      description: 'The brick access token',
    });
  },
});

export const DebitTransaction = objectType({
  name: 'DebitTransaction',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('transactionName', {
      description: 'The transaction display name',
    });

    t.nonNull.string('debitAccountId', {
      description: 'The debit account Id',
    });

    t.nonNull.dateTime('dateTimestamp', {
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

    t.nonNull.boolean('onlineTransaction', {
      description: 'Whether or not this transaction is online',
    });

    t.nonNull.boolean('isReviewed', {
      description:
        'Whether or not this transaction is reviewed by the user on the client',
    });

    t.nonNull.field('merchant', {
      type: 'Merchant',
      description: 'The merchant',
    });

    t.nonNull.string('merchantId', {
      description: 'The merchant Id',
    });

    t.list.nonNull.field('category', {
      type: 'NameAmountJson',
      description: 'The category for this transaction',
    });

    t.nonNull.string('transactionType', {
      description:
        "The transaction type for this transaction. It's either `INCOME`, `EXPENSE`, or `TRANSFER`",
    });

    t.nonNull.string('description', {
      description: 'The description given by the Banks API',
    });

    t.string('internalTransferTransactionId', {
      description: 'The transaction id for internal transfer',
    });

    t.nonNull.string('direction', {
      description:
        "The direction of the transaction. It's either `IN`, or `OUT`",
    });

    t.nonNull.boolean('isSubscription', {
      description: 'Whether or not this transaction is a subscription',
    });

    t.string('notes', {
      description: 'Additional notes for this transaction',
    });

    t.field('location', {
      type: 'Location',
      description: 'The location of the transaction',
    });

    t.list.nonNull.field('tags', {
      type: 'NameAmountJson',
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

export const DebitTransactionSubscriptionType = objectType({
  name: 'DebitTransactionSubscriptionType',
  definition(t) {
    t.nonNull.field('mutationType', {
      type: 'typeOfMutationType',
      description: 'The type of mutationType. Either `ADD` `EDIT` or `DELETE`',
    });
    t.nonNull.field('transaction', { type: 'DebitTransaction' });
  },
});
