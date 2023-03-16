import { inputObjectType, objectType } from 'nexus';

export const Location = objectType({
  name: 'Location',
  definition(t) {
    t.nonNull.string('latitude');
    t.nonNull.string('longitude');
  },
});

export const NameAmountJson = objectType({
  name: 'NameAmountJson',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('amount');
  },
});

export interface INameAmountJson {
  name: string;
  amount: string;
}

export const LocationInputType = inputObjectType({
  name: 'LocationInputType',
  definition(t) {
    t.nonNull.string('latitude');
    t.nonNull.string('longitude');
  },
});

export const NameAmountJsonInput = inputObjectType({
  name: 'NameAmountJsonInput',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('amount');
  },
});
