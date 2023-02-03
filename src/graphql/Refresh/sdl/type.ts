import { objectType } from 'nexus';

export const Refresh = objectType({
  name: 'Refresh',
  definition(t) {
    t.nonNull.string('id');

    t.nonNull.field('user', {
      type: 'User',
    });

    t.nonNull.string('userId');

    t.nonNull.string('date');
  },
});
