import { toTimeStamp } from '../../../utils/date';
import { arg, extendType, nonNull } from 'nexus';
import {
  brickPublicAccessToken,
  brickUrl,
  getClientIdandRedirectRefId,
} from '../../../utils/brick';
import axios from 'axios';
import {
  decodeEWalletAccountId,
  decodePayLaterAccountId,
} from '../../../utils/auth';

export const EWalletQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllEWalletTransaction', {
      type: 'EWalletTransaction',
      description:
        'Get all the e-wallet transaction from their eWalletAccountId',
      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with e-wallet account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { eWalletAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eWalletAccount = await prisma.eWalletAccount.findFirst({
          where: { AND: [{ id: eWalletAccountId, userId: user.id }] },
        });

        if (!eWalletAccount)
          throw { status: 5100, message: 'Akun e-wallet tidak ditemukan.' };

        const allTransactions = await prisma.eWalletTransaction.findMany({
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        let responseArray: any[] = [];

        for (let i = 0; i < allTransactions.length; i++) {
          const element = allTransactions[i];

          const decodedEWalletAccountId = decodeEWalletAccountId(
            element.eWalletAccountId
          );

          if (decodedEWalletAccountId === eWalletAccount.id) {
            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId },
            });

            if (!merchant)
              throw { status: 2400, message: 'Merchant tidak ditemukan.' };

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              eWalletAccountId: element.eWalletAccountId,
              dateTimestamp: toTimeStamp(element.dateTimestamp),
              currency: element.currency,
              amount: element.amount,
              merchant: merchant,
              merchantId: element.merchantId,
              category: element.category,
              direction: element.direction,
              transactionType: element.transactionType,
              internalTransferTransactionId:
                element.internalTransferTransactionId,
              notes: element.notes,
              location: element.location,
              tags: element.tags,
              isHideFromBudget: element.isHideFromBudget,
              isHideFromInsight: element.isHideFromInsight,
              description: element.description,
              institutionId: element.institutionId,
              referenceId: element.referenceId,
              onlineTransaction: element.onlineTransaction,
              isReviewed: element.isReviewed,
              isSubscription: element.isSubscription,
            };

            responseArray.push(obj);
          }
        }

        return responseArray;
      },
    });

    t.list.field('getAllPayLaterTransaction', {
      type: 'PayLaterTransaction',
      description:
        'Get all the pay later transaction from their payLaterAccountId',
      args: {
        payLaterAccountId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with pay later account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { payLaterAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) {
          throw { status: 1100, message: 'Token tidak valid.' };
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const payLaterAccount = await prisma.payLaterAccount.findFirst({
          where: { AND: [{ id: payLaterAccountId, userId: user.id }] },
        });

        if (!payLaterAccount)
          throw { status: 5500, message: 'Akun pay later tidak ditemukan.' };

        const allTransactions = await prisma.payLaterTransaction.findMany({
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        let responseArray: any[] = [];

        for (let i = 0; i < allTransactions.length; i++) {
          const element = allTransactions[i];

          const decodedPayLaterAccountId = decodePayLaterAccountId(
            element.payLaterAccountId
          );

          if (decodedPayLaterAccountId === payLaterAccount.id) {
            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId },
            });

            if (!merchant)
              throw { status: 2400, message: 'Merchant tidak ditemukan.' };

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              payLaterAccountId: element.payLaterAccountId,
              dateTimestamp: toTimeStamp(element.dateTimestamp),
              currency: element.currency,
              amount: element.amount,
              merchant: merchant,
              merchantId: element.merchantId,
              category: element.category,
              direction: element.direction,
              transactionType: element.transactionType,
              internalTransferTransactionId:
                element.internalTransferTransactionId,
              notes: element.notes,
              location: element.location,
              tags: element.tags,
              isHideFromBudget: element.isHideFromBudget,
              isHideFromInsight: element.isHideFromInsight,
              description: element.description,
              institutionId: element.institutionId,
              referenceId: element.referenceId,
              onlineTransaction: element.onlineTransaction,
              isReviewed: element.isReviewed,
              isSubscription: element.isSubscription,
            };

            responseArray.push(obj);
          }
        }

        return responseArray;
      },
    });

    t.list.field('getAllEWalletAccount', {
      type: 'EWalletAccount',
      description: 'Get all e-wallet account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eWalletAccount = await prisma.eWalletAccount.findMany({
          where: { userId: user.id },
        });

        if (!eWalletAccount)
          throw { status: 5100, message: 'Akun e-wallet tidak ditemukan.' };

        let response: any[] = [];

        for (let i = 0; i < eWalletAccount.length; i++) {
          const element = eWalletAccount[i];

          const obj = {
            id: element.id,
            userId: element.userId,
            createdAt: toTimeStamp(element.createdAt),
            lastUpdate: toTimeStamp(element.lastUpdate),
            balance: element.balance,
            currency: element.currency,
            institutionId: element.institutionId,
            accountNumber: element.accountNumber,
          };

          response.push(obj);
        }

        return response;
      },
    });

    t.list.field('getAllPayLaterAccount', {
      type: 'PayLaterAccount',
      description: 'Get all pay later account for a particular user.',

      async resolve(parent, args, context, info) {
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const payLaterAccount = await prisma.payLaterAccount.findMany({
          where: { userId: user.id },
        });

        if (!payLaterAccount)
          throw { status: 5500, message: 'Akun pay later tidak ditemukan.' };

        let response: any[] = [];

        for (let i = 0; i < payLaterAccount.length; i++) {
          const element = payLaterAccount[i];

          const obj = {
            id: element.id,
            userId: element.userId,
            createdAt: toTimeStamp(element.createdAt),
            lastUpdate: toTimeStamp(element.lastUpdate),
            balance: element.balance,
            currency: element.currency,
            institutionId: element.institutionId,
            accountNumber: element.accountNumber,
          };

          response.push(obj);
        }

        return response;
      },
    });

    t.field('sendOtpGopayViaBrick', {
      type: 'OTPData',
      description: 'Send OTP Gopay for connecting via Brick',
      args: {
        nomorHp: nonNull(
          arg({
            type: 'String',
            description: 'Nomor hp gopay',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { nomorHp } = args;

        const { userId, prisma } = context;

        if (!userId) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw new Error('Cannot find user');

        // Call the function to get ClientId and RedirectRefId needed for getting the access token
        const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
          user.id
        ).catch((e) => {
          throw new Error(e);
        });

        const url = brickUrl(`/v1/auth/${clientId}`);

        const options = {
          method: 'POST',
          url: url.href,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${brickPublicAccessToken}`,
          },
          data: {
            institutionId: 11,
            username: nomorHp,
            redirectRefId,
          },
        };

        const {
          data: { data },
        }: { data: { data: BrickOTPData } } = await axios
          .request(options)
          .catch((e) => {
            throw new Error(e);
          });

        return {
          username: data.username,
          uniqueId: data.uniqueId,
          sessionId: data.sessionId,
          otpToken: data.otpToken,
          redirectRefId,
          clientId,
        };
      },
    });
  },
});
