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

      async resolve(
        __,
        { name, picture, url },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const alreadyMerchant = await prisma.merchant.findFirst({
            where: { OR: [{ name }, { url }] },
          });

          if (alreadyMerchant)
            throw new Error(
              'Merchant dengan nama atau url tersebut sudah ada.'
            );

          const response = await prisma.merchant.create({
            data: { name, picture, url },
          });

          await pubsub.publish(`newMerchantLive`, {
            merchant: response,
          });

          return {
            id: response.id,
            name: response.name,
            picture: response.picture,
            url: response.url,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
