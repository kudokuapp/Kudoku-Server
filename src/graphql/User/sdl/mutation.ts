import { arg, extendType } from 'nexus';

export const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('updateUserFirstAndLastName', {
      type: 'User',
      description:
        "Change user's info (email, whatsapp, etc.) but not the user public profile",
      args: {
        firstName: arg({
          type: 'String',
          description:
            'Fill this with the updated firstName, otherwise fill this with "null"',
        }),
        lastName: arg({
          type: 'String',
          description:
            'Fill this with the updated lastName, otherwise fill this with "null"',
        }),
      },

      async resolve(parent, args, context) {
        const { firstName, lastName } = args;
        const { userId: id } = context;

        if (!id) {
          throw new Error('Invalid token');
        }

        if (firstName !== null && firstName !== undefined) {
          await context.prisma.user.update({
            where: { id },
            data: { firstName },
          });
        }
        if (lastName !== null && lastName !== undefined) {
          await context.prisma.user.update({
            where: { id },
            data: { lastName },
          });
        }

        if (!lastName && !firstName) {
          throw new Error('Cannot have both firstName and lastName null');
        }

        const response = await context.prisma.user.findFirst({ where: { id } });

        if (!response)
          throw new Error('somehow cannot find user after updating');

        if (!response.username) throw new Error('Username is null');

        return {
          id: response.id,
          username: response.username,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          whatsapp: response.whatsapp,
          kudosNo: response.kudosNo,
        };
      },
    });
  },
});
