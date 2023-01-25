import { Profile, User } from '@prisma/client';
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

      async resolve(parent, args, context, info) {
        const { userId, username } = args;

        let response: Profile;
        let responseUser: User;

        if (userId !== null && userId !== undefined) {
          const user = await context.prisma.user.findFirst({
            where: { id: userId },
          });
          if (!user) throw new Error('Cannot find user');
          responseUser = user;

          const profile = await context.prisma.profile.findFirst({
            where: { userId },
          });
          if (!profile) throw new Error('Cannot find profile');

          response = profile;
        } else if (username !== null && username !== undefined) {
          const user = await context.prisma.user.findFirst({
            where: { username },
          });
          if (!user) throw new Error('Cannot find user');
          responseUser = user;
          const profile = await context.prisma.profile.findFirst({
            where: { user: { username } },
          });
          if (!profile) throw new Error('Cannot find profile');

          response = profile;
        } else {
          throw new Error(
            'Cannot find have all id, username, and token null or undefined'
          );
        }

        return {
          id: response.id,
          user: responseUser,
          userId: response.id,
          bio: response.bio ?? null,
          profilePicture: response.profilePicture ?? null,
          birthday: response.birthday
            ? `${new Date(response.birthday).getFullYear()}-${
                new Date(response.birthday).getMonth() + 1
              }-${new Date(response.birthday).getDate()}`
            : null,
        };
      },
    });
  },
});
