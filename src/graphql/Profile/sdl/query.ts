import { Profile, User } from '@prisma/client';
import { cleanDate } from '../../../utils/date';
import { arg, extendType } from 'nexus';

export const ProfileQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('getProfile', {
      type: 'Profile',
      description: "Get User's profile from their userId or username",
      args: {
        userId: arg({
          type: 'String',
          description:
            'Fill this with their id, otherwise fill this with "null"',
        }),
        username: arg({
          type: 'String',
          description:
            'Fill this with username, otherwise fill this with "null"',
        }),
      },

      async resolve(__, { userId, username }, { prisma }, ___) {
        try {
          let response: Profile;
          let responseUser: User;

          if (userId !== null && userId !== undefined) {
            const user = await prisma.user.findFirstOrThrow({
              where: { id: userId },
            });

            const profile = await prisma.profile.findFirstOrThrow({
              where: { userId },
            });

            responseUser = user;
            response = profile;
          } else if (username !== null && username !== undefined) {
            const user = await prisma.user.findFirstOrThrow({
              where: { username },
            });

            const profile = await prisma.profile.findFirstOrThrow({
              where: { user: { username } },
            });

            responseUser = user;
            response = profile;
          } else {
            throw new Error('Semua value tidak boleh null atau undefined.');
          }

          if (!responseUser.username) throw new Error('Tidak ada username.');

          return {
            id: response.id,
            user: {
              id: responseUser.id,
              username: responseUser.username,
              firstName: responseUser.firstName,
              lastName: responseUser.lastName,
              email: responseUser.email,
              whatsapp: responseUser.whatsapp,
              kudosNo: responseUser.kudosNo,
              createdAt: responseUser.createdAt,
            },
            userId: response.id,
            bio: response.bio ?? null,
            profilePicture: response.profilePicture ?? null,
            birthday: response.birthday ? cleanDate(response.birthday) : null,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
