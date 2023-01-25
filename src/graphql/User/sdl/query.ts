import { arg, extendType, idArg, nonNull, stringArg } from 'nexus';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '$utils/auth';

export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('getAllUser', {
      type: 'User',
      description:
        "This API is to get every user's data in our database. Useful for checking if username is already taken or not.",

      async resolve(parent, args, context, info) {
        return await context.prisma.user.findMany();
      },
    });

    t.field('getUser', {
      type: 'User',
      description: "Get User's info from either their ID, Username, or Token",
      args: {
        id: arg({
          type: 'String',
          description:
            'Fill this with their id, otherwise fill this with "null"',
        }),
        username: arg({
          type: 'String',
          description:
            'Fill this with username, otherwise fill this with "null"',
        }),
        token: arg({
          type: 'String',
          description:
            'Fill this with JWT Token, otherwise fill this with "null"',
        }),
      },
      async resolve(parent, args, context, info) {
        const { id, username, token } = args;

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
