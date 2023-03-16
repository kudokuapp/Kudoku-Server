import { arg, extendType, nonNull } from 'nexus';

export const MerchantMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addMerchant', {
      type: 'Merchant',
      description: "Add new merchant, if it's not available",
      args: {
        name: nonNull(
          arg({
            type: 'String',
            description: 'The merchant name',
          })
        ),
        picture: nonNull(
          arg({
            type: 'String',
            description: "The merchant's display picture",
          })
        ),

        url: nonNull(
          arg({
            type: 'String',
            description: 'The merchant url',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { name, picture, url } = args;
        const { userId: id, prisma } = context;

        if (!id) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const alreadyMerchant = await prisma.merchant.findFirst({
          where: { OR: [{ name }, { picture }, { url }] },
        });

        if (alreadyMerchant)
          throw {
            status: 2005,
            message:
              'Merchant dengan nama atau url atau gambar tersebut sudah ada.',
          };

        const response = await prisma.merchant.create({
          data: { name, picture, url },
        });

        return {
          id: response.id,
          name: response.name,
          picture: response.picture,
          url: response.url,
        };
      },
    });
  },
});
