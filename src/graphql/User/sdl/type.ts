import { objectType } from 'nexus';

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });
    t.nonNull.string('username');
    t.nonNull.string('firstName');
    t.nonNull.string('lastName');
    t.nonNull.string('email');
    t.nonNull.string('whatsapp');
    t.nonNull.int('kudosNo', {
      description: 'This is the kudos No.',
    });

    t.nonNull.string('createdAt');
  },
});
