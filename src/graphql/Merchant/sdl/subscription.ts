import { Merchant } from '@prisma/client';
import { extendType } from 'nexus';

interface IPayloadNewMerchant {
  merchant: Merchant;
}

export const MerchantSubscription = extendType({
  type: 'Subscription',
  definition(t) {
    t.field('newMerchantLive', {
      type: 'Merchant',
      description: 'Subscription for new merchant',

      subscribe: async (__, ____, { pubsub }, ___) => {
        // Subscribe to transaction creation events with the specified accountId
        return pubsub.asyncIterator(`newMerchantLive`);
      },

      resolve: async (payload: IPayloadNewMerchant, ___, { prisma }, __) => {
        const { merchant } = payload;

        return {
          id: merchant.id,
          name: merchant.name,
          picture: merchant.picture,
          url: merchant.url,
        };
      },
    });
  },
});
