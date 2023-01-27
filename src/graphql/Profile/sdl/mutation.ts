import { cleanDate, toTimeStamp } from '../../../utils/date';
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

        if (user.username === null || user.username === undefined)
          throw new Error('username is null or undefined');

        return {
          id: response.id,
          user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            whatsapp: user.whatsapp,
            kudosNo: user.kudosNo,
            createdAt: toTimeStamp(user.createdAt),
          },
          userId: user.id,
          bio: response.bio ?? null,
          profilePicture: response.profilePicture ?? null,
          birthday: response.birthday ? cleanDate(response.birthday) : null,
        };
      },
    });
  },
});
