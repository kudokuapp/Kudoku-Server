import { objectType } from 'nexus';

export const BrickPayLoad = objectType({
  name: 'BrickPayLoad',
  definition(t) {
    t.nonNull.string('token', {
      description: 'JWT Token',
    });
    t.nonNull.field('user', {
      type: 'User',
    });
  },
});
