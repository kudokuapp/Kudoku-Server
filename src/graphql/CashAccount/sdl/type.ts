import { objectType } from 'nexus';

export const CashAccount = objectType({
  name: 'CashAccount',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.field('user', {
      type: 'User',
    });

    t.nonNull.string('userId');

    t.nonNull.string('createdAt', {
      description: 'When this account is created',
    });

    // t.nonNull.field('cashTransaction', {
    //   type: 'CashTransaction',
    // });

    t.nonNull.string('accountName', {
      description:
        'Name, should user choose it\'s name differently. Default should be just "Cash"',
    });

    t.string('displayPicture', { description: 'base64 image' });

    t.nonNull.string('balance', {
      description: 'The balance of that cash account',
    });
  },
});

export const CashTransaction = objectType({
  name: 'CashTransaction',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.field('cashAccount', {
      type: 'CashAccount',
      description: 'The cash account associated to this transaction',
    });

    t.nonNull.string('cashAccountId', {
      description: 'The cash account Id',
    });

    t.nonNull.string('currency', {
      description: 'ISO 4217 Currency',
    });

    t.nonNull.string('amount', {
      description: 'The transaction amount',
    });

    t.nonNull.field('merchant', {
      type: 'Merchant',
      description: 'The merchant'
    })

    t.nonNull.string('merchantId', {
      description: 'The merchant Id'
    })

    t.nonNull.list.string('expenseCategory', {
      description: 'The expense category for this transaction',
    });

    t.nonNull.string('transactionType', {
      description:
        "The transaction type for this transaction. It's either `income`, `expense`, or `internalTransfer`",
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

/*
model CashTransaction {
  id                    String            @id @default(auto()) @map("_id") @db.ObjectId
  cashAccount           CashAccount       @relation(fields: [cashAcountId], references: [id])
  cashAcountId          String            @unique @db.ObjectId
  dateTimestamp         DateTime
  currency              String
  amount                String            //Takut aneh kalo number
  merchant              Merchant          @relation(fields: [merchantId], references: [id])
  merchantId            String            @unique @db.ObjectId
  expenseCategory       String[]
  transactionType       TransactionType   @default(expense)
  notes                 String
  location              Location
  tags                  String[]
  isHideFromBudget      Boolean           @default(false)
  isHideFromInsight     Boolean           @default(false) 
}
*/
