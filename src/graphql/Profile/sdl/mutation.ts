import { cleanDate } from '../../../utils/date/cleanDate';
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

      async resolve(
        __,
        { bio, profilePicture, birthday },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          if (!user.username) throw new Error('Tidak ada username.');

          if (!bio && !profilePicture && !birthday)
            throw {
              status: 2003,
              message: 'Semua value tidak boleh null atau undefined.',
            };

          const date = birthday ? new Date(birthday) : null;

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
              createdAt: user.createdAt,
            },
            userId: user.id,
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
