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

        const { userId: id, prisma } = context;

        if (!id) {
          throw new Error('Invalid token');
        }

        const date = new Date(birthday);

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('Cannot find user');

        const response = await prisma.profile.update({
          where: { userId: user.id },
          data: { bio, profilePicture, birthday: date },
        });

        return { response };
      },
    });
  },
});
