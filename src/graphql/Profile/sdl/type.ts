import { objectType } from 'nexus';

export const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.nonNull.string('id', {
      description: 'id generated automatically by MongoDB',
    });

    t.nonNull.field('user', {
      type: 'User',
    });

    t.nonNull.string('userId', {
      description: 'userId for that particular user',
    });

    t.string('bio');

    t.string('profilePicture');

    t.string('birthday');
  },
});
