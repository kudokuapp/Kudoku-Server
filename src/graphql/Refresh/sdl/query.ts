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

      async resolve(__, { userId, username }, { prisma }, ___) {
        try {
          let refresh: Refresh[];
          let user: User;

          if (userId !== null && userId !== undefined) {
            const response = await prisma.user.findFirstOrThrow({
              where: { id: userId },
            });

            user = response;

            refresh = await prisma.refresh.findMany({
              where: { userId: response.id },
              orderBy: [{ date: 'desc' }],
            });
          } else if (username !== null && username !== undefined) {
            const response = await prisma.user.findFirstOrThrow({
              where: { username },
            });

            user = response;

            refresh = await prisma.refresh.findMany({
              where: { user: { username: response.username } },
              orderBy: [{ date: 'desc' }],
            });
          } else {
            throw new Error('Semua value tidak boleh null atau undefined.');
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
                createdAt: user.createdAt,
              },

              date: element.date,
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
