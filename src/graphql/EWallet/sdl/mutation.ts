// import { arg, extendType, nonNull } from 'nexus';
// import { toTimeStamp } from '../../../utils/date';
// import { findBrickTransactionIndex } from '../../../utils/transaction';
// import {
//   brickUrl,
//   getClientIdandRedirectRefId,
//   brickPublicAccessToken,
//   mapBrickInstitutionIdToKudoku,
// } from '../../../utils/brick';
// import axios from 'axios';
// import moment from 'moment';
// import { DirectionType, TransactionType } from '@prisma/client';
// import _ from 'lodash';

// export const EWalletAccountMutation = extendType({
//   type: 'Mutation',
//   definition(t) {
//     t.nonNull.field('connectGopayViaBrick', {
//       type: 'EWalletAccount',
//       description: 'Connect Gopay account via BRICK.',

//       args: {
//         username: nonNull(
//           arg({
//             type: 'String',
//             description: 'Nomor HP Gopay',
//           })
//         ),

//         redirectRefId: nonNull(
//           arg({
//             type: 'Int',
//             description:
//               'redirectRefId after running `sendOtpGopayViaBrick` query',
//           })
//         ),

//         clientId: nonNull(
//           arg({
//             type: 'Int',
//             description: 'clientId after running `sendOtpGopayViaBrick` query',
//           })
//         ),

//         sessionId: nonNull(
//           arg({
//             type: 'String',
//             description: 'sessionId after running `sendOtpGopayViaBrick` query',
//           })
//         ),

//         uniqueId: nonNull(
//           arg({
//             type: 'String',
//             description: 'uniqueId after running `sendOtpGopayViaBrick` query',
//           })
//         ),

//         otpToken: nonNull(
//           arg({
//             type: 'String',
//             description: 'otpToken after running `sendOtpGopayViaBrick` query',
//           })
//         ),

//         otp: nonNull(
//           arg({
//             type: 'String',
//             description: 'otp after running `sendOtpGopayViaBrick` query',
//           })
//         ),
//       },

//       async resolve(parent, args, context, info) {
//         // const {
//         //   username,
//         //   otp,
//         //   otpToken,
//         //   uniqueId,
//         //   sessionId,
//         //   clientId,
//         //   redirectRefId,
//         // } = args;
//         // const { userId, prisma } = context;

//         // if (!userId) throw new Error('Invalid token');

//         // const searchUser = await prisma.user.findFirst({
//         //   where: { id: userId },
//         // });

//         // if (!searchUser) {
//         //   throw new Error('User does not exist');
//         // }

//         // const url = brickUrl(`/v1/auth/gopay/${clientId}`);

//         // const options = {
//         //   method: 'POST',
//         //   url: url.href,
//         //   headers: {
//         //     Accept: 'application/json',
//         //     'Content-Type': 'application/json',
//         //     Authorization: `Bearer ${brickPublicAccessToken}`,
//         //   },
//         //   data: {
//         //     institutionId: 11,
//         //     username,
//         //     redirectRefId,
//         //     sessionId,
//         //     uniqueId,
//         //     otpToken,
//         //     otp,
//         //   },
//         // };

//         // const {
//         //   data: { data },
//         // }: { data: { data: BrickTokenData } } = await axios
//         //   .request(options)
//         //   .catch((e) => {
//         //     console.error(e);
//         //     throw new Error(e);
//         //   });

//         const accountDetail = await getAccountDetail(
//           'access-production-06554c8f-33db-47a0-8ba8-18006a8614c1'
//         ).catch((e) => {
//           console.error(e);
//           throw new Error(e);
//         });

//         console.log(accountDetail);

//         // Wallet
//         // accountDetail[0]

//         //Paylater
//         // accountDetail[1]

//         /*
//         Avoid same account duplication
//         */
//         // const eWalletAccount = await prisma.eWalletAccount.findFirst({
//         //   where: {
//         //     AND: [
//         //       { },
//         //       { userId },
//         //     ],
//         //   },
//         // });

//         // if (eWalletAccount)
//         //   throw new Error('The same account has already been created');

//         // const debitAccount = await prisma.debitAccount.create({
//         //   data: {
//         //     userId: searchUser.id,
//         //     institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
//         //     accountNumber: accountDetail[0].accountNumber,
//         //     accessToken: data.accessToken,
//         //     balance: accountDetail[0].balances.available.toString(),
//         //     createdAt: new Date(),
//         //     lastUpdate: new Date(),
//         //     currency: accountDetail[0].currency,
//         //   },
//         // });

//         // /*
//         // Pull the initial transaction for the month
//         // */

//         // const transactionUrl = brickUrl(`/v1/transaction/list`);

//         // const from = moment()
//         //   .startOf('M')
//         //   .subtract(1, 'month')
//         //   .format('YYYY-MM-DD');

//         // const to = moment().add(1, 'day').format('YYYY-MM-DD');

//         // console.log(from);

//         // console.log(to);

//         const transactionOptions = {
//           method: 'GET',
//           url: 'https://api.onebrick.io/v1/transaction/list',
//           params: { from: '2023-01-01', to: '2023-02-02' },
//           headers: {
//             Accept: 'application/json',
//             'Content-Type': 'application/json',
//             Authorization: `Bearer access-production-06554c8f-33db-47a0-8ba8-18006a8614c1`,
//           },
//         };

//         const {
//           data: { data: transactionData },
//         }: { data: { data: BrickTransactionData[] } } = await axios
//           .request(transactionOptions)
//           .catch((e) => {
//             console.error(e);
//             throw new Error(e);
//           });

//         console.log(transactionData);

//         // for (let i = 0; i < transactionData.length; i++) {
//         //   const element = transactionData[i];

//         //   const obj = {
//         //     debitAccountId: debitAccount.id,
//         //     dateTimestamp: new Date(
//         //       moment(element.dateTimestamp).add(1, 'day') as unknown as Date
//         //     ),
//         //     referenceId: element.reference_id,
//         //     currency: element.account_currency,
//         //     amount: element.amount.toString(),
//         //     onlineTransaction: false,
//         //     isReviewed: false,
//         //     merchantId: '63d8b775d3e050940af0caf1',
//         //     category: [
//         //       { name: 'UNDEFINED', amount: element.amount.toString() },
//         //     ],
//         //     transactionType: (element.direction === 'in'
//         //       ? 'INCOME'
//         //       : 'EXPENSE') as TransactionType,
//         //     direction: (element.direction === 'in'
//         //       ? 'IN'
//         //       : 'OUT') as DirectionType,
//         //     isSubscription: false,
//         //     description: element.description,
//         //     institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
//         //     tags: [],
//         //     isHideFromBudget: false,
//         //     isHideFromInsight: false,
//         //     transactionMethod: 'UNDEFINED',
//         //   };

//         //   await prisma.debitTransaction.create({ data: obj });
//         // }

//         // return {
//         //   id: debitAccount.id,
//         //   userId: debitAccount.userId,
//         //   institutionId: debitAccount.institutionId,
//         //   accountNumber: debitAccount.accountNumber,
//         //   accessToken: debitAccount.accessToken,
//         //   balance: debitAccount.balance,
//         //   createdAt: toTimeStamp(debitAccount.createdAt),
//         //   lastUpdate: toTimeStamp(debitAccount.lastUpdate),
//         //   currency: debitAccount.currency,
//         // };
//       },
//     });
//   },
// });

// export const EWalletTransactionMutation = extendType({
//   type: 'Mutation',
//   definition(t) {
//     t.nonNull.field('refreshEWalletTransaction', {
//       type: 'ResponseMessage',
//       description:
//         'Update transaction and balance for a particular e-wallet account',
//       args: {
//         eWalletAccountId: nonNull(
//           arg({
//             type: 'String',
//             description: 'The associated id of that e-wallet account id',
//           })
//         ),
//       },

//       async resolve(parent, args, context, info) {
//         const { eWalletAccountId } = args;

//         const { userId, prisma } = context;

//         if (!userId) throw new Error('Invalid token');

//         const user = await prisma.user.findFirst({ where: { id: userId } });

//         if (!user) throw new Error('Cannot find user');

//         const eWalletAccount = await prisma.eWalletAccount.findFirst({
//           where: { id: eWalletAccountId },
//         });

//         if (!eWalletAccount) throw new Error('Cannot find the debit account');

//         const eWalletTransaction = await prisma.eWalletTransaction.findMany({
//           where: { eWalletAccountId: eWalletAccount.id },
//           orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
//         });

//         const { dateTimestamp, referenceId } = eWalletTransaction[0];

//         const from = moment(dateTimestamp)
//           .subtract(1, 'day')
//           .format('YYYY-MM-DD');
//         const to = moment().add(1, 'day').format('YYYY-MM-DD');

//         const transactionUrl = brickUrl(`/v1/transaction/list`);

//         const transactionOptions = {
//           method: 'GET',
//           url: transactionUrl.href,
//           params: { from, to },
//           headers: {
//             Accept: 'application/json',
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${eWalletAccount.accessToken}`,
//           },
//         };

//         const {
//           data: { data },
//         }: { data: { data: BrickTransactionData[] } } = await axios
//           .request(transactionOptions)
//           .catch((e) => {
//             throw new Error(e);
//           });

//         const transactionData = _.sortBy(data, [
//           'dateTimestamp',
//           'reference_id',
//         ]);

//         const index = findBrickTransactionIndex(referenceId, transactionData);

//         const newTransaction = transactionData.splice(
//           index + 1,
//           transactionData.length
//         );

//         if (newTransaction.length === 0)
//           throw new Error('There is no new transaction');

//         for (let i = 0; i < newTransaction.length; i++) {
//           const element = newTransaction[i];

//           await prisma.eWalletTransaction.create({
//             data: {
//               eWalletAccountId: eWalletAccount.id,
//               dateTimestamp: new Date(
//                 moment(element.dateTimestamp).add(1, 'day') as unknown as Date
//               ),
//               referenceId: element.reference_id,
//               currency: element.account_currency,
//               amount: element.amount.toString(),
//               onlineTransaction: false,
//               isReviewed: false,
//               merchantId: '63d8b775d3e050940af0caf1',
//               category: [
//                 { name: 'UNDEFINED', amount: element.amount.toString() },
//               ],
//               transactionType: (element.direction === 'in'
//                 ? 'INCOME'
//                 : 'EXPENSE') as TransactionType,
//               direction: (element.direction === 'in'
//                 ? 'IN'
//                 : 'OUT') as DirectionType,
//               isSubscription: false,
//               description: element.description,
//               institutionId: eWalletAccount.institutionId,
//               tags: [],
//               isHideFromBudget: false,
//               isHideFromInsight: false,
//               transactionMethod: 'UNDEFINED',
//             },
//           });
//         }

//         /*
//         Update balance after pulling new transaction
//         */
//         const accountDetail = await getAccountDetail(
//           eWalletAccount.accessToken
//         ).catch((e) => {
//           throw new Error(e);
//         });

//         await prisma.eWalletAccount.update({
//           where: { id: eWalletAccountId },
//           data: {
//             balance: accountDetail[0].balances.current.toString(),
//             lastUpdate: new Date(),
//           },
//         });

//         /*
//         Create data on the 'Refresh' collection
//         */
//         await prisma.refresh.create({
//           data: {
//             userId: user.id,
//             date: new Date(),
//           },
//         });

//         return {
//           response: `Successfully create ${newTransaction.length} new transaction and update new balance`,
//         };
//       },
//     });
//   },
// });

// async function getAccountDetail(
//   accessToken: string
// ): Promise<BrickAccountDetail[]> {
//   // const url = brickUrl(`/v1/account/list`);

//   // const url = new URL('https://api.onebrick.io/v1/account/list', '');

//   const options = {
//     method: 'GET',
//     url: 'https://api.onebrick.io/v1/account/list',
//     headers: {
//       Accept: 'application/json',
//       Authorization: `Bearer ${accessToken}`,
//     },
//   };

//   return new Promise((resolve, reject) => {
//     (async () => {
//       try {
//         const {
//           data: { data },
//         }: { data: { data: BrickAccountDetail[] } } = await axios.request(
//           options
//         );

//         resolve(data);
//       } catch (e) {
//         reject(e);
//       }
//     })();
//   });
// }
