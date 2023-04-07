import { objectType } from 'nexus';

export const Budgeting = objectType({
  name: 'Budgeting',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('userId');

    t.nonNull.dateTime('createdAt', {
      description: 'When this budgeting is created',
    });

    t.nonNull.dateTime('lastUpdate', {
      description: 'When this budgeting is last updated',
    });

    t.nonNull.field('budgetTypeId', {
      type: 'BudgetTypeEnum',
      description: 'Budget type of this budgeting',
    });

    t.nonNull.string('budgetName', {
      description: 'The name of this budgeting',
    });

    t.nonNull.string('amount', {
      description: 'The amount of this budgeting',
    });
  },
});

export const CategoryPlan = objectType({
  name: 'CategoryPlan',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.dateTime('createdAt', {
      description: 'When this budgeting is created',
    });

    t.nonNull.dateTime('lastUpdate', {
      description: 'When this budgeting is last updated',
    });

    t.nonNull.string('budgetId', {
      description: 'Budget id of this planning category',
    });

    t.nonNull.string('categoryId', {
      description: 'Category id of this planning category',
    });

    t.nonNull.string('tagId', {
      description: 'Tag id of this planning category',
    });

    t.nonNull.boolean('monthly', {
      description: 'Is this planning category is same for all month or not ?',
    });

    t.nonNull.string('amount', {
      description: 'The amount of this planning category',
    });
  },
});
