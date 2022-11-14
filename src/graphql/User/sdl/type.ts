import { objectType } from 'nexus';

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });
    t.nonNull.string('username');
    t.nonNull.string('name');
    t.nonNull.string('email');
    t.nonNull.string('whatsapp');
    t.nonNull.int('kudos', {
      description: 'This is the kudos No.',
    });
  },
});
