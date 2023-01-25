import { arg, extendType } from 'nexus';

export const ProfileMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('updateProfile', {
      type: 'Profile',
      description: "Change user's public profile",
      args: {
        bio: arg({
          type: 'String',
          description: "Fill this with the user's public bio",
        }),
        profilePicture: arg({
          type: 'String',
          description:
            "Fill this with the user's profile picture. Important: Use base64 images.",
        }),
        birthday: arg({
          type: 'String',
          description: "Fill this with the user's birthday. Format: YYYY-MM-DD",
        }),
      },

      async resolve(parent, args, context) {
        const { bio, profilePicture, birthday } = args;

        if (!bio && !profilePicture && !birthday)
          throw new Error('One value must be not null or undefined');

        const { userId: id, prisma } = context;

        if (!id) {
          throw new Error('Invalid token');
        }

        const date = birthday ? new Date(birthday) : null;

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('Cannot find user');

        const profile = await prisma.profile.findFirst({
          where: { userId: user.id },
        });

        if (!profile)
          await prisma.profile.create({ data: { userId: user.id } });

        if (bio !== null && bio !== undefined) {
          await prisma.profile.update({
            where: { userId: user.id },
            data: { bio },
          });
        }
        if (profilePicture !== null && profilePicture !== undefined) {
          await prisma.profile.update({
            where: { userId: user.id },
            data: { profilePicture },
          });
        }
        if (date !== null && date !== undefined) {
          await prisma.profile.update({
            where: { userId: user.id },
            data: { birthday: date },
          });
        }

        const response = await prisma.profile.findFirst({
          where: { userId: user.id },
        });

        if (!response) throw new Error('Unable to reach the server');

        return {
          id: response.id,
          user: user,
          userId: user.id,
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
