import { extendType } from 'nexus';

export const MerchantQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('getAllMerchant', {
      type: 'Merchant',
      description: "This API is to get every merchant's data",

      async resolve(parent, args, context, info) {
        const { userId: id, prisma } = context;

        if (!id) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const excludedMerchantIds = [
          //UNDEFINED
          '63d8b775d3e050940af0caf1',

          //RECONCILE
          '640ff9450ce7b9e3754d332c',

          //TRANSFER
          '640ff9670ce7b9e3754d332d',

          //INCOME
          '6414a1e910657b29b4ffbaf9',
        ];

        return await prisma.merchant.findMany({
          where: {
            NOT: {
              id: {
                in: excludedMerchantIds,
              },
            },
          },
        });
      },
    });
  },
});
