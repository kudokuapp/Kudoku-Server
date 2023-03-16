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
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };

        const { userId: id, prisma } = context;

        if (!id) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const date = birthday ? new Date(birthday) : null;

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const profile = await prisma.profile.findFirst({
          where: { userId: user.id },
        });

        if (!profile)
          await prisma.profile.create({ data: { userId: user.id } });

        const response = await prisma.profile.update({
          where: { userId: user.id },
          data: {
            bio: bio ?? null,
            profilePicture: profilePicture ?? null,
            birthday: date,
          },
        });

        if (!user.username)
          throw { status: 1600, message: 'Tidak ada username.' };

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
