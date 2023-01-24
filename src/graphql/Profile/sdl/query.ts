import { arg, extendType, idArg, nonNull, stringArg } from 'nexus';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '$utils/auth';

export const ProfileQuery = extendType({
  type: 'Query',
  definition(t) {

    t.field('getUser', {
      type: 'Profile',
      description: "Get User's info from either their userId or username",
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

        if (id !== null && id !== undefined) {
          const user = await context.prisma.user.findFirst({ where: { id } });
          if (!user) throw new Error('Cannot find user');
          return user;
        } else if (username !== null && username !== undefined) {
          const user = await context.prisma.user.findFirst({
            where: { username },
          });
          if (!user) throw new Error('Cannot find user');
          return user;
        } else if (token !== null && token !== undefined) {
          const { userId } = jwt.verify(
            token,
            process.env.APP_SECRET as string
          ) as AuthTokenPayload;
          const user = await context.prisma.user.findFirst({
            where: { id: userId },
          });
          if (!user) throw new Error('Cannot find user');
          return user;
        } else {
          throw new Error(
            'Cannot find have all id, username, and token null or undefined'
          );
        }
      },
    });
  },
});
