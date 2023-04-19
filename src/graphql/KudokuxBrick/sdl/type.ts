import { inputObjectType } from 'nexus';

export const KudokuxBrickAccount = inputObjectType({
  name: 'KudokuxBrickAccount',
  definition(t) {
    t.nonNull.string('accountId');

    t.nonNull.string('accountHolder');

    t.nonNull.string('accountNumber');

    t.nonNull.field('balances', {
      type: 'KudokuxBrickBalance',
    });

    t.nonNull.string('currency');

    t.string('type');

    t.nonNull.string('accessToken');

    t.nonNull.int('institutionId');
  },
});

export const KudokuxBrickBalance = inputObjectType({
  name: 'KudokuxBrickBalance',
  definition(t) {
    t.nonNull.float('available');
    t.nonNull.float('current');
    t.float('limit');
  },
});

export const KudokuxBrickTransactionCategory = inputObjectType({
  name: 'KudokuxBrickTransactionCategory',
  definition(t) {
    t.int('category_id');
    t.string('category_name');
    t.int('classification_group_id');
    t.string('classification_group');
    t.int('classification_subgroup_id');
    t.string('classification_subgroup');
  },
});

export const KudokuxBrickTransaction = inputObjectType({
  name: 'KudokuxBrickTransaction',
  definition(t) {
    t.nonNull.string('dateTimestamp');

    t.nonNull.int('id');

    t.nonNull.string('account_id');

    t.nonNull.string('account_number');

    t.nonNull.string('account_currency');

    t.nonNull.int('institution_id');

    t.nonNull.int('merchant_id');

    t.nonNull.int('outlet_outlet_id');

    t.nonNull.int('location_city_id');

    t.nonNull.int('location_country_id');

    t.nonNull.string('date');

    t.nonNull.float('amount');

    t.nonNull.string('description');

    t.nonNull.string('status');

    t.nonNull.string('direction');

    t.nonNull.string('reference_id');

    t.field('category', {
      type: 'KudokuxBrickTransactionCategory',
    });

    t.string('transaction_type');
  },
});
