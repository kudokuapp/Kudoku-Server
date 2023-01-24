import { arg, extendType, idArg, nonNull, stringArg } from 'nexus';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { APP_SECRET } from '../../../utils/auth';

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
          return await context.prisma.user.update({
            where: { id },
            data: { firstName },
          });
        } else if (lastName !== null && lastName !== undefined) {
          return await context.prisma.user.update({
            where: { id },
            data: { lastName },
          });
        } else {
          throw new Error('Cannot have both firstName and lastName null');
        }
      },
    });
  },
});
