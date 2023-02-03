import { toTimeStamp } from '../../../utils/date';
import { Refresh, User } from '@prisma/client';
import { arg, extendType } from 'nexus';

export const RefreshQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getRefresh', {
      type: 'Refresh',
      description: "Get the User's frequent refresh behaviour",
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

        const { prisma } = context;

        let response: Refresh;
        let responseUser: User;

        if (userId !== null && userId !== undefined) {
          const user = await prisma.user.findFirst({
            where: { id: userId },
          });
          if (!user) throw new Error('Cannot find user');
          responseUser = user;

          const refresh = await prisma.refresh.findFirst({
            where: { userId },
          });
          if (!refresh) throw new Error('Cannot find refresh profile');

          response = refresh;
        } else if (username !== null && username !== undefined) {
          const user = await prisma.user.findFirst({
            where: { username },
          });
          if (!user) throw new Error('Cannot find user');
          responseUser = user;
          const refresh = await prisma.refresh.findFirst({
            where: { user: { username } },
          });
          if (!refresh) throw new Error('Cannot find refresh');

          response = refresh;
        } else {
          throw new Error(
            'Cannot find have all id, username, and token null or undefined'
          );
        }

        if (!responseUser.username)
          throw new Error('username is null or undefined');

        return {
          id: response.id,
          userId: response.userId,

          user: {
            id: responseUser.id,
            username: responseUser.username,
            firstName: responseUser.firstName,
            lastName: responseUser.lastName,
            email: responseUser.email,
            whatsapp: responseUser.whatsapp,
            kudosNo: responseUser.kudosNo,
            createdAt: toTimeStamp(responseUser.createdAt),
          },

          date: toTimeStamp(response.date),
        };
      },
    });
  },
});
