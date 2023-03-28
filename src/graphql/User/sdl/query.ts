import { arg, extendType, nonNull } from 'nexus';

export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.field('getAllUser', {
      type: 'User',

      description:
        "This API is to get every user's data in our database. Useful for checking if username is already taken or not.",

      async resolve(__, ___, { prisma }, ____) {
        try {
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
              createdAt: element.createdAt,
            };

            arrayOfUsers.push(obj);
          }

          return arrayOfUsers;
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getUser', {
      type: 'User',

      description: "Get User's info from their Username",

      args: {
        username: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with username',
          })
        ),
      },
      async resolve(__, { username }, { prisma }, ___) {
        try {
          const user = await prisma.user.findFirstOrThrow({
            where: { username },
          });

          return {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            whatsapp: user.whatsapp,
            createdAt: user.createdAt,
            kudosNo: user.kudosNo,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
