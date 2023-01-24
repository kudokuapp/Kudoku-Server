import { objectType } from 'nexus';

export const User = objectType({
  name: 'Profile',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.string('userId', {
      description: 'userId for that particular user',
    });

    t.nonNull.string('bio');

    t.nonNull.string('profilePicture');

    t.nonNull.string('birthday');
  },
});
