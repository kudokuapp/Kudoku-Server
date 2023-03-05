import { inputObjectType, objectType, enumType } from 'nexus';

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

export const typeOfAccount = enumType({
  name: 'typeOfAccount',
  members: ['CASH', 'DEBIT', 'EWALLET', 'EMONEY'],
});
