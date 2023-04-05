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

    t.nonNull.string('budgetTypeId', {
        description:
        'Budget type of this budgeting',
    });

    t.nonNull.string('budgetName', {
        description: 'The name of this budgeting',
    });

    t.nonNull.string('amount', {
        description: 'The amount of this budgeting',
    });
    },
});