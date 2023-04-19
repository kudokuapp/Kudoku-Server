import { objectType } from 'nexus';

export const EWalletAccount = objectType({
  name: 'EWalletAccount',
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
      description:
        'Wether or not this e-wallet account access token is expired',
    });

    t.string('brickAccessToken', {
      description: 'The brick access token',
    });

    t.int('brickInstitutionId', {
      description: 'Brick institution ID.',
    });
  },
});

export const EWalletTransaction = objectType({
  name: 'EWalletTransaction',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('transactionName', {
      description: 'The transaction display name',
    });

    t.nonNull.string('eWalletAccountId', {
      description: 'The E-Wallet account Id',
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

    t.list.field('tags', {
      type: 'NameAmountJson',
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

export const OTPData = objectType({
  name: 'OTPData',

  definition(t) {
    t.nonNull.string('username');

    t.nonNull.string('uniqueId');

    t.nonNull.string('sessionId');

    t.nonNull.string('otpToken');

    t.nonNull.int('redirectRefId');

    t.nonNull.int('clientId');
  },
});

export const EWalletTransactionSubscriptionType = objectType({
  name: 'EWalletTransactionSubscriptionType',
  definition(t) {
    t.nonNull.field('mutationType', {
      type: 'typeOfMutationType',
      description: 'The type of mutationType. Either `ADD` `EDIT` or `DELETE`',
    });
    t.nonNull.field('transaction', { type: 'EWalletTransaction' });
  },
});

export const GopayEWalletAndPayLaterAccount = objectType({
  name: 'GopayEWalletAndPayLaterAccount',
  definition(t) {
    t.nonNull.field('EWallet', { type: 'EWalletAccount' });
    t.nonNull.field('PayLater', { type: 'PayLaterAccount' });
  },
});

export const GopayEWalletAndPayLaterTransaction = objectType({
  name: 'GopayEWalletAndPayLaterTransaction',
  definition(t) {
    t.nonNull.list.field('EWallet', { type: 'EWalletTransaction' });
    t.nonNull.list.field('PayLater', { type: 'PayLaterTransaction' });
  },
});
