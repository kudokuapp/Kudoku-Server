// import { toTimeStamp } from '../../../utils/date';
// import { arg, extendType, nonNull } from 'nexus';
// import {
//   brickPublicAccessToken,
//   brickUrl,
//   getClientIdandRedirectRefId,
// } from '../../../utils/brick';
// import axios from 'axios';

// export const EWalletQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.list.field('getAllEWalletTransaction', {
//       type: 'EWalletTransaction',
//       description:
//         'Get all the e-wallet transaction from their eWalletAccountId',
//       args: {
//         eWalletAccountId: nonNull(
//           arg({
//             type: 'String',
//             description: 'Fill this with e-wallet account id',
//           })
//         ),
//       },

//       async resolve(parent, args, context, info) {
//         const { eWalletAccountId } = args;

//         const { userId, prisma } = context;

//         if (!userId) {
//           throw new Error('Invalid token');
//         }

//         const user = await prisma.user.findFirst({ where: { id: userId } });

//         if (!user) throw new Error('Cannot find user');

//         const eWalletAccount = await prisma.eWalletAccount.findFirst({
//           where: { id: eWalletAccountId },
//         });

//         if (!eWalletAccount) throw new Error('Cannot find debit account');

//         const response = await prisma.eWalletTransaction.findMany({
//           where: { eWalletAccountId },
//           orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
//         });

//         let responseArray: any[] = [];

//         for (let i = 0; i < response.length; i++) {
//           const element = response[i];

//           const merchant = await prisma.merchant.findFirst({
//             where: { id: element.merchantId ?? '63d3be20009767d5eb7e7410' },
//           });

//           const obj = {
//             id: element.id,
//             eWalletAccountId: element.eWalletAccountId,
//             dateTimestamp: toTimeStamp(element.dateTimestamp),
//             currency: element.currency,
//             amount: element.amount,
//             merchant: merchant ?? null,
//             merchantId: element.merchantId ?? null,
//             category: element.category,
//             direction: element.direction,
//             transactionType: element.transactionType,
//             internalTransferAccountId: element.internalTransferAccountId,
//             notes: element.notes,
//             location: element.location,
//             tags: element.tags,
//             isHideFromBudget: element.isHideFromBudget,
//             isHideFromInsight: element.isHideFromInsight,
//             description: element.description,
//             institutionId: element.institutionId,
//             referenceId: element.referenceId,
//             onlineTransaction: element.onlineTransaction,
//             isReviewed: element.isReviewed,
//             isSubscription: element.isSubscription,
//             transactionMethod: element.transactionMethod,
//           };

//           responseArray.push(obj);
//         }

//         return responseArray;
//       },
//     });

//     t.list.field('getAllEWalletAccount', {
//       type: 'EWalletAccount',
//       description: 'Get all e-wallet account for a particular user.',

//       async resolve(parent, args, context, info) {
//         const { userId, prisma } = context;

//         if (!userId) throw new Error('Invalid token');

//         const eWalletAccount = await prisma.eWalletAccount.findMany({
//           where: { userId },
//         });

//         if (!eWalletAccount)
//           throw new Error('User have not created a debit account');

//         let response: any[] = [];

//         for (let i = 0; i < eWalletAccount.length; i++) {
//           const element = eWalletAccount[i];

//           const obj = {
//             id: element.id,
//             userId: element.userId,
//             createdAt: toTimeStamp(element.createdAt),
//             lastUpdate: toTimeStamp(element.lastUpdate),
//             balance: element.balance,
//             currency: element.currency,
//             institutionId: element.institutionId,
//             accountNumber: element.accountNumber,
//             type: element.type,
//           };

//           response.push(obj);
//         }

//         return response;
//       },
//     });

//     t.field('sendOtpGopayViaBrick', {
//       type: 'OTPData',
//       description: 'Send OTP Gopay for connecting via Brick',
//       args: {
//         nomorHp: nonNull(
//           arg({
//             type: 'String',
//             description: 'Nomor hp gopay',
//           })
//         ),
//       },

//       async resolve(parent, args, context, info) {
//         const { nomorHp } = args;

//         const { userId, prisma } = context;

//         if (!userId) throw new Error('Invalid token');

//         const user = await prisma.user.findFirst({ where: { id: userId } });

//         if (!user) throw new Error('Cannot find user');

//         // Call the function to get ClientId and RedirectRefId needed for getting the access token
//         const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
//           user.id
//         ).catch((e) => {
//           throw new Error(e);
//         });

//         const url = brickUrl(`/v1/auth/${clientId}`);

//         const options = {
//           method: 'POST',
//           url: url.href,
//           headers: {
//             Accept: 'application/json',
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${brickPublicAccessToken}`,
//           },
//           data: {
//             institutionId: 11,
//             username: nomorHp,
//             redirectRefId,
//           },
//         };

//         const {
//           data: { data },
//         }: { data: { data: BrickOTPData } } = await axios
//           .request(options)
//           .catch((e) => {
//             throw new Error(e);
//           });

//         return {
//           username: data.username,
//           uniqueId: data.uniqueId,
//           sessionId: data.sessionId,
//           otpToken: data.otpToken,
//           redirectRefId,
//           clientId,
//         };
//       },
//     });
//   },
// });
