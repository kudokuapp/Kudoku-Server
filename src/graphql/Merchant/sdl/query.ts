import { extendType } from 'nexus';

export const MerchantQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('getAllMerchant', {
      type: 'Merchant',
      description: "This API is to get every merchant's data",

      async resolve(parent, args, context, info) {
        return await context.prisma.merchant.findMany();
      },
    });
  },
});
