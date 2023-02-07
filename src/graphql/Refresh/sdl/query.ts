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

        let refresh: Refresh[];
        let user: User;

        if (userId !== null && userId !== undefined) {
          const response = await prisma.user.findFirst({
            where: { id: userId },
          });
          if (!response) throw new Error('Cannot find user');

          user = response;

          refresh = await prisma.refresh.findMany({
            where: { userId },
            orderBy: [{ date: 'desc' }],
          });
        } else if (username !== null && username !== undefined) {
          const response = await prisma.user.findFirst({
            where: { username },
          });
          if (!response) throw new Error('Cannot find user');
          user = response;

          refresh = await prisma.refresh.findMany({
            where: { user: { username } },
            orderBy: [{ date: 'desc' }],
          });
        } else {
          throw new Error(
            'Cannot find have all id, username, and token null or undefined'
          );
        }

        let response: any[] = [];

        for (let i = 0; i < refresh.length; i++) {
          const element = refresh[i];

          const obj = {
            id: element.id,
            userId: element.userId,

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

            date: toTimeStamp(element.date),
          };

          response.push(obj);
        }

        return response;
      },
    });
  },
});
