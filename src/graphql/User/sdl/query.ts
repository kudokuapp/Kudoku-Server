import { arg, extendType, nonNull } from 'nexus';
import { toTimeStamp } from '../../../utils/date';

export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.field('getAllUser', {
      type: 'User',
      description:
        "This API is to get every user's data in our database. Useful for checking if username is already taken or not.",

      async resolve(parent, args, context, info) {
        const { prisma } = context;

        const user = await prisma.user.findMany();

        let arrayOfUsers: any[] = [];

        for (let i = 0; i < user.length; i++) {
          const element = user[i];

          const obj = {
            id: element.id,
            username: element.username,
            firstName: element.firstName,
            lastName: element.lastName,
            email: element.email,
            whatsapp: element.whatsapp,
            createdAt: toTimeStamp(element.createdAt),
          };

          arrayOfUsers.push(obj);
        }

        return arrayOfUsers;
      },
    });

    t.field('getUser', {
      type: 'User',
      description: "Get User's info from their Username",
      args: {
        username: nonNull(
          arg({
            type: 'String',
            description:
              'Fill this with username, otherwise fill this with "null"',
          })
        ),
      },
      async resolve(parent, args, context, info) {
        const { username } = args;

        const { prisma } = context;

        const user = await prisma.user.findFirst({ where: { username } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          whatsapp: user.whatsapp,
          createdAt: toTimeStamp(user.createdAt),
          kudosNo: user.kudosNo,
        };
      },
    });
  },
});
