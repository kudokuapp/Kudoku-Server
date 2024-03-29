import { arg, extendType, nonNull } from 'nexus';
import axios from 'axios';
import {
  getClientIdandRedirectRefId,
  brickUrl,
  brickPublicAccessToken,
} from '../../../utils/brick';
import { decodeEWalletAccountId } from '../../../utils/auth';

export const EWalletAccountQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllEWalletAccount', {
      type: 'EWalletAccount',
      description: 'Get all e-wallet account for a particular user.',

      async resolve(__, ___, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eWalletAccount = await prisma.eWalletAccount.findMany({
            where: { userId: user.id },
          });

          let response: any[] = [];

          for (let i = 0; i < eWalletAccount.length; i++) {
            const element = eWalletAccount[i];

            const obj = {
              id: element.id,
              userId: element.userId,
              createdAt: element.createdAt,
              lastUpdate: element.lastUpdate,
              balance: element.balance,
              currency: element.currency,
              institutionId: element.institutionId,
              accountNumber: element.accountNumber,
              expired: element.expired,
              brickAccessToken: element.accessToken,
              brickInstitutionId: element.brickInstitutionId,
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { nomorHp }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Invalid token');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          // Call the function to get ClientId and RedirectRefId needed for getting the access token
          const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
            user.id
          );

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
          }: { data: { data: BrickOTPData } } = await axios.request(options);

          return {
            username: data.username,
            uniqueId: data.uniqueId,
            sessionId: data.sessionId,
            otpToken: data.otpToken,
            redirectRefId,
            clientId,
          };
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
    });

    t.field('getInfoEWalletAccount', {
      type: 'EWalletAccount',

      description: 'Get info on a particular e-wallet account',

      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The e-wallet account id',
          })
        ),
      },

      resolve: async (__, { eWalletAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eWalletAccount = await prisma.eWalletAccount.findFirstOrThrow({
            where: { AND: [{ id: eWalletAccountId }, { userId: user.id }] },
          });

          const allEWalletTransaction =
            await prisma.eWalletTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
            });

          const latestTransaction = allEWalletTransaction.find((element) => {
            const decodedEWalletAccountId = decodeEWalletAccountId(
              element.eWalletAccountId
            );
            return decodedEWalletAccountId === eWalletAccount.id;
          });

          return {
            id: eWalletAccount.id,
            userId: user.id,
            institutionId: eWalletAccount.institutionId,
            accountNumber: eWalletAccount.accountNumber,
            createdAt: eWalletAccount.createdAt,
            lastUpdate: latestTransaction
              ? latestTransaction.dateTimestamp
              : eWalletAccount.lastUpdate,
            balance: eWalletAccount.balance,
            currency: eWalletAccount.currency,
            expired: eWalletAccount.expired,
            brickAccessToken: eWalletAccount.accessToken,
            brickInstitutionId: eWalletAccount.brickInstitutionId,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getEWalletAccountViaBrickAccessToken', {
      type: 'EWalletAccount',

      description:
        'Get info on a particular e-wallet account based on brick access token.',

      args: {
        accessToken: nonNull(
          arg({
            type: 'String',
            description: 'The access token.',
          })
        ),
      },

      resolve: async (__, { accessToken }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eWalletAccount = await prisma.eWalletAccount.findFirstOrThrow({
            where: { AND: [{ accessToken }, { userId: user.id }] },
          });

          return {
            id: eWalletAccount.id,
            userId: user.id,
            institutionId: eWalletAccount.institutionId,
            accountNumber: eWalletAccount.accountNumber,
            createdAt: eWalletAccount.createdAt,
            lastUpdate: eWalletAccount.lastUpdate,
            balance: eWalletAccount.balance,
            currency: eWalletAccount.currency,
            expired: eWalletAccount.expired,
            brickAccessToken: eWalletAccount.accessToken,
            brickInstitutionId: eWalletAccount.brickInstitutionId,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const EWalletTransactionQuery = extendType({
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

      async resolve(__, { eWalletAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eWalletAccount = await prisma.eWalletAccount.findFirstOrThrow({
            where: { AND: [{ id: eWalletAccountId, userId: user.id }] },
          });

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
              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                transactionName: element.transactionName,
                eWalletAccountId: element.eWalletAccountId,
                dateTimestamp: element.dateTimestamp,
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
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getEWalletLatestTransaction', {
      type: 'EWalletTransaction',

      description: 'Get the latest e-wallet transaction',

      args: {
        eWalletAccountId: nonNull(
          arg({ type: 'String', description: 'The eWalletAccountId' })
        ),
      },

      resolve: async (__, { eWalletAccountId }, { userId, prisma }, ___) => {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const eWalletAccount = await prisma.eWalletAccount.findFirstOrThrow({
            where: { id: eWalletAccountId, userId: user.id },
          });

          const allEWalletTransaction =
            await prisma.eWalletTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
            });

          const eWalletTransaction = allEWalletTransaction.filter((v) => {
            const decodedEWalletAccountId = decodeEWalletAccountId(
              v.eWalletAccountId
            );

            return eWalletAccount.id === decodedEWalletAccountId;
          });

          if (eWalletTransaction.length === 0)
            throw new Error('There is no transaction in this debit account.');

          const latestTransaction = eWalletTransaction[0];

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: latestTransaction.merchantId },
          });

          return {
            id: latestTransaction.id,
            transactionName: latestTransaction.transactionName,
            eWalletAccountId: latestTransaction.eWalletAccountId,
            dateTimestamp: latestTransaction.dateTimestamp,
            currency: latestTransaction.currency,
            amount: latestTransaction.amount,
            merchant: merchant,
            merchantId: latestTransaction.merchantId,
            category: latestTransaction.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            direction: latestTransaction.direction,
            transactionType: latestTransaction.transactionType,
            internalTransferTransactionId:
              latestTransaction.internalTransferTransactionId,
            notes: latestTransaction.notes,
            location: latestTransaction.location,
            tags: latestTransaction.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isHideFromBudget: latestTransaction.isHideFromBudget,
            isHideFromInsight: latestTransaction.isHideFromInsight,
            description: latestTransaction.description,
            institutionId: latestTransaction.institutionId,
            referenceId: latestTransaction.referenceId,
            onlineTransaction: latestTransaction.onlineTransaction,
            isReviewed: latestTransaction.isReviewed,
            isSubscription: latestTransaction.isSubscription,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
