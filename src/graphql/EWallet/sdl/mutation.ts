import { arg, extendType, list, nonNull } from 'nexus';
import axios from 'axios';
import moment from 'moment';
import {
  DirectionType,
  EWalletAccount,
  EWalletTransaction,
  PayLaterAccount,
  PayLaterTransaction,
  TransactionType,
} from '@prisma/client';
import _ from 'lodash';
import brickUrl from '../../../utils/brick/url';
import brickPublicAccessToken from '../../../utils/brick/publicAccessToken';
import getAccountDetail from '../../../utils/brick/getAccountDetail';
import {
  decodeEWalletAccountId,
  encodeEWalletAccountId,
} from '../../../utils/auth/eWalletAccountId';
import {
  decodePayLaterAccountId,
  encodePayLaterAccountId,
} from '../../../utils/auth/payLaterAccountId';
import isAccessTokenIsExpired from '../../../utils/brick/isAccessTokenExpired';
import findBrickTransactionIndex from '../../../utils/transaction/findBrickTransactionIndex';
import mapBrickInstitutionIdToKudoku from '../../../utils/brick/mapBrickInstitutionIdToKudoku';

export const EWalletAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('connectGopayViaBrick', {
      type: 'GopayEWalletAndPayLaterAccount',
      description: 'Connect Gopay account via BRICK.',

      args: {
        username: nonNull(
          arg({
            type: 'String',
            description: 'Nomor HP Gopay',
          })
        ),

        redirectRefId: nonNull(
          arg({
            type: 'Int',
            description:
              'redirectRefId after running `sendOtpGopayViaBrick` query',
          })
        ),

        clientId: nonNull(
          arg({
            type: 'Int',
            description: 'clientId after running `sendOtpGopayViaBrick` query',
          })
        ),

        sessionId: nonNull(
          arg({
            type: 'String',
            description: 'sessionId after running `sendOtpGopayViaBrick` query',
          })
        ),

        uniqueId: nonNull(
          arg({
            type: 'String',
            description: 'uniqueId after running `sendOtpGopayViaBrick` query',
          })
        ),

        otpToken: nonNull(
          arg({
            type: 'String',
            description: 'otpToken after running `sendOtpGopayViaBrick` query',
          })
        ),

        otp: nonNull(
          arg({
            type: 'String',
            description: 'otp after running `sendOtpGopayViaBrick` query',
          })
        ),
      },

      async resolve(
        __,
        {
          username,
          otp,
          otpToken,
          uniqueId,
          sessionId,
          clientId,
          redirectRefId,
        },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const url = brickUrl(`/v1/auth/gopay/${clientId}`);

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
              username,
              redirectRefId,
              sessionId,
              uniqueId,
              otpToken,
              otp,
            },
          };

          const {
            data: { data },
          }: { data: { data: BrickTokenData } } = await axios.request(options);

          const accountDetail = await getAccountDetail(data.accessToken);

          /**
           * Wallet = accountDetail[0]
           * Paylater = accountDetail[1]
           */

          /**
           * Avoid same account duplication
           */
          const walletAccountSearch = await prisma.eWalletAccount.findFirst({
            where: {
              AND: [
                { accountNumber: accountDetail[0].accountNumber },
                { userId: user.id },
              ],
            },
          });

          const paylaterAccountSearch = await prisma.eWalletAccount.findFirst({
            where: {
              AND: [
                { accountNumber: accountDetail[1].accountNumber },
                { userId: user.id },
              ],
            },
          });

          if (walletAccountSearch || paylaterAccountSearch)
            throw new Error('Akun e-wallet atau pay later sudah ada.');

          const eWalletAccount = await prisma.eWalletAccount.create({
            data: {
              userId: user.id,
              institutionId: '63d94170d3e050940af0caf2',
              accountNumber: accountDetail[0].accountNumber,
              accessToken: data.accessToken,
              balance: accountDetail[0].balances.available.toString(),
              createdAt: new Date(),
              lastUpdate: new Date(),
              currency: accountDetail[0].currency,
              expired: false,
            },
          });

          const payLaterAccount = await prisma.payLaterAccount.create({
            data: {
              userId: user.id,
              institutionId: '641300b21465d712b0207f9c',
              accountNumber: accountDetail[1].accountNumber,
              accessToken: data.accessToken,
              balance: accountDetail[1].balances.available.toString(),
              createdAt: new Date(),
              lastUpdate: new Date(),
              currency: accountDetail[1].currency,
              expired: false,
            },
          });

          /**
           * Pull the initial transaction for the month
           */

          const transactionUrl = brickUrl(`/v1/transaction/list`);

          const from = moment().subtract(7, 'days').format('YYYY-MM-DD');

          const to = moment().format('YYYY-MM-DD');

          const transactionOptions = {
            method: 'GET',
            url: transactionUrl.href,
            params: { from, to },
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.accessToken}`,
            },
          };

          const {
            data: { data: transactionData },
          }: { data: { data: BrickTransactionData[] } } = await axios.request(
            transactionOptions
          );

          for (let i = 0; i < transactionData.length; i++) {
            const element = transactionData[i];

            if (element.transaction_type === 'Wallet') {
              const obj = {
                eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
                transactionName: element.description,
                dateTimestamp: new Date(
                  moment(element.dateTimestamp).add(1, 'day') as unknown as Date
                ),
                referenceId: element.reference_id,
                currency: element.account_currency,
                amount: `${element.amount}`,
                onlineTransaction: false,
                isReviewed: false,
                merchantId: '63d8b775d3e050940af0caf1',
                category: [{ name: 'UNDEFINED', amount: `${element.amount}` }],
                transactionType: (element.direction === 'in'
                  ? 'INCOME'
                  : 'EXPENSE') as TransactionType,
                direction: (element.direction === 'in'
                  ? 'IN'
                  : 'OUT') as DirectionType,
                isSubscription: false,
                description: element.description,
                institutionId: '63d94170d3e050940af0caf2',
                isHideFromBudget: false,
                isHideFromInsight: false,
              };

              await prisma.eWalletTransaction.create({ data: obj });
            } else {
              const obj = {
                payLaterAccountId: encodePayLaterAccountId(payLaterAccount.id),
                transactionName: element.description,
                dateTimestamp: new Date(
                  moment(element.dateTimestamp).add(1, 'day') as unknown as Date
                ),
                referenceId: element.reference_id,
                currency: element.account_currency,
                amount: `${element.amount}`,
                onlineTransaction: false,
                isReviewed: false,
                merchantId: '63d8b775d3e050940af0caf1',
                category: [{ name: 'UNDEFINED', amount: `${element.amount}` }],
                transactionType: (element.direction === 'in'
                  ? 'INCOME'
                  : 'EXPENSE') as TransactionType,
                direction: (element.direction === 'in'
                  ? 'IN'
                  : 'OUT') as DirectionType,
                isSubscription: false,
                description: element.description,
                institutionId: '641300b21465d712b0207f9c',
                isHideFromBudget: false,
                isHideFromInsight: false,
              };

              await prisma.payLaterTransaction.create({ data: obj });
            }
          }

          return {
            EWallet: {
              id: eWalletAccount.id,
              userId: eWalletAccount.userId,
              createdAt: eWalletAccount.createdAt,
              lastUpdate: eWalletAccount.lastUpdate,
              balance: eWalletAccount.balance,
              currency: eWalletAccount.currency,
              institutionId: eWalletAccount.institutionId,
              accountNumber: eWalletAccount.accountNumber,
              expired: eWalletAccount.expired,
            },

            PayLater: {
              id: payLaterAccount.id,
              userId: payLaterAccount.userId,
              createdAt: payLaterAccount.createdAt,
              lastUpdate: payLaterAccount.lastUpdate,
              balance: payLaterAccount.balance,
              currency: payLaterAccount.currency,
              institutionId: payLaterAccount.institutionId,
              accountNumber: payLaterAccount.accountNumber,
              expired: payLaterAccount.expired,
            },
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('deleteGopayAccount', {
      type: 'ResponseMessage',
      description:
        'Delete e-wallet account. Specifically, delete gopay account. Because gopay has two type, ewallet and paylater account',

      args: {
        eWalletAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The e-wallet account id',
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
            where: { AND: [{ id: eWalletAccountId }, { userId: user.id }] },
          });

          const payLaterAccount = await prisma.payLaterAccount.findFirstOrThrow(
            {
              where: {
                AND: [
                  { accessToken: eWalletAccount.accessToken },
                  { userId: user.id },
                ],
              },
            }
          );

          await prisma.eWalletAccount.delete({
            where: { id: eWalletAccount.id },
          });

          await prisma.payLaterAccount.delete({
            where: { id: payLaterAccount.id },
          });

          const eWalletTransaction = await prisma.eWalletTransaction.findMany();

          let eWalletCount = 0;

          for (let i = 0; i < eWalletTransaction.length; i++) {
            const element = eWalletTransaction[i];

            const decodedEWalletAccount = decodeEWalletAccountId(
              element.eWalletAccountId
            );

            if (decodedEWalletAccount === eWalletAccount.id) {
              await prisma.eWalletTransaction.delete({
                where: { id: element.id },
              });
              eWalletCount += 1;
            }
          }

          const payLaterTransaction =
            await prisma.payLaterTransaction.findMany();

          let payLaterCount = 0;

          for (let i = 0; i < payLaterTransaction.length; i++) {
            const element = payLaterTransaction[i];

            const decodedPayLaterAccount = decodePayLaterAccountId(
              element.payLaterAccountId
            );

            if (decodedPayLaterAccount === payLaterAccount.id) {
              await prisma.payLaterTransaction.delete({
                where: { id: element.id },
              });
              payLaterCount += 1;
            }
          }

          return {
            response: `Successfully delete e-wallet account with id ${eWalletAccount.id} and ${eWalletCount} transactions associated with that account. Also successfully delete paylater account with id ${payLaterAccount.id} and ${payLaterCount} transactions associated with that account`,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

export const EWalletTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('refreshGopayTransactionViaBrick', {
      type: 'GopayEWalletAndPayLaterTransaction',
      description: 'Update transaction and balance for gopay account',
      args: {
        eWalletAccountId: arg({
          type: 'String',
          description: 'The associated id of that e-wallet account id',
        }),

        payLaterAccountId: arg({
          type: 'String',
          description: 'The associated id of that paylater account id',
        }),
      },

      async resolve(
        __,
        { eWalletAccountId, payLaterAccountId },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!eWalletAccountId && !payLaterAccountId)
            throw new Error('Semua value tidak boleh null atau undefined.');

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          let accessToken: string | null = null;
          let eWalletAccount: EWalletAccount | null = null;
          let payLaterAccount: PayLaterAccount | null = null;

          if (eWalletAccountId !== null && eWalletAccountId !== undefined) {
            const eWalletAccountSearch =
              await prisma.eWalletAccount.findFirstOrThrow({
                where: { id: eWalletAccountId },
              });

            const payLaterAccountSearch =
              await prisma.payLaterAccount.findFirstOrThrow({
                where: { accessToken: eWalletAccountSearch.accessToken },
              });

            eWalletAccount = eWalletAccountSearch;
            payLaterAccount = payLaterAccountSearch;
            accessToken = eWalletAccountSearch.accessToken;
          }

          if (payLaterAccountId !== null && payLaterAccountId !== undefined) {
            const payLaterAccountSearch =
              await prisma.payLaterAccount.findFirstOrThrow({
                where: { id: payLaterAccountId },
              });

            const eWalletAccountSearch =
              await prisma.eWalletAccount.findFirstOrThrow({
                where: { accessToken: payLaterAccountSearch.accessToken },
              });

            eWalletAccount = eWalletAccountSearch;
            payLaterAccount = payLaterAccountSearch;
            accessToken = payLaterAccountSearch.accessToken;
          }

          if (
            accessToken === null ||
            payLaterAccount === null ||
            eWalletAccount === null
          )
            throw new Error(
              'accesstoken, paylateraccount, dan ewalletaccount semuanya null'
            );

          /**
           * Check if the access token expired or not
           */

          const expired = await isAccessTokenIsExpired(accessToken);

          if (expired) {
            const expiredEWalletAccount = await prisma.eWalletAccount.update({
              where: { id: eWalletAccount.id },
              data: { expired: true },
            });
            await pubsub.publish(`eWalletAccountUpdated_${eWalletAccount.id}`, {
              eWalletAccountUpdate: expiredEWalletAccount,
            });

            const expiredPayLaterAccount = await prisma.payLaterAccount.update({
              where: { id: payLaterAccount.id },
              data: { expired: true },
            });
            await pubsub.publish(
              `payLaterAccountUpdated_${payLaterAccount.id}`,
              {
                payLaterAccountUpdate: expiredPayLaterAccount,
              }
            );

            throw new Error(
              'Access token gopay via Brick untuk e-wallet akun dan paylater akun sudah expired.'
            );
          }

          const eWalletTransactionAll =
            await prisma.eWalletTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
            });

          const payLaterTransactionAll =
            await prisma.payLaterTransaction.findMany({
              orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
            });

          let eWalletTransactionNew: EWalletTransaction[] = [];
          let payLaterTransactionNew: PayLaterTransaction[] = [];

          for (let i = 0; i < eWalletTransactionAll.length; i++) {
            const element = eWalletTransactionAll[i];

            const decodedEWalletAccountId = decodeEWalletAccountId(
              element.eWalletAccountId
            );

            if (decodedEWalletAccountId === eWalletAccount.id) {
              eWalletTransactionNew.push(element);
            }
          }

          for (let i = 0; i < payLaterTransactionAll.length; i++) {
            const element = payLaterTransactionAll[i];

            const decodedPayLaterAccountId = decodePayLaterAccountId(
              element.payLaterAccountId
            );

            if (decodedPayLaterAccountId === payLaterAccount.id) {
              payLaterTransactionNew.push(element);
            }
          }

          /**
           * We first check the existing transaction
           * We need to check whether or not this exist
           * This is because we need dateTimestamp and referenceId
           * to refresh the Gopay transaction
           */

          const eWalletTransaction =
            eWalletTransactionNew.length > 0 ? eWalletTransactionNew[0] : null;
          const payLaterTransaction =
            payLaterTransactionNew.length > 0
              ? payLaterTransactionNew[0]
              : null;

          const dateTimestampEWallet = eWalletTransaction
            ? eWalletTransaction.dateTimestamp
            : null;
          const referenceIdEWallet = eWalletTransaction
            ? eWalletTransaction.referenceId
            : null;

          const dateTimestampPayLater = payLaterTransaction
            ? payLaterTransaction.dateTimestamp
            : null;
          const referenceIdPayLater = payLaterTransaction
            ? payLaterTransaction.referenceId
            : null;

          /**
           * The first if is
           * if all the value is not null.
           * In other words, there is transaction
           * for gopay wallet and gopay pay later.
           * Both exist in our database
           */

          let eWalletTransactionToIterate: EWalletTransaction[] = [];
          let payLaterTransactionToIterate: PayLaterTransaction[] = [];

          if (
            dateTimestampEWallet !== null &&
            referenceIdEWallet !== null &&
            dateTimestampPayLater !== null &&
            referenceIdPayLater !== null
          ) {
            const findLatestTransaction = () => {
              const getReferenceNumber = (referenceId: string) => {
                const regex = /[^-]+$/;
                const referenceIdRegex = referenceId.match(regex);
                const referenceIdNum = referenceIdRegex
                  ? Number(referenceIdRegex[0])
                  : 0;
                return referenceIdNum;
              };

              const ewalletMoment = moment(dateTimestampEWallet);
              const paylaterMoment = moment(dateTimestampPayLater);

              if (ewalletMoment.isSame(paylaterMoment, 'day')) {
                const ewalletRefNum = getReferenceNumber(referenceIdEWallet);
                const paylaterRefNum = getReferenceNumber(referenceIdPayLater);
                return ewalletRefNum > paylaterRefNum
                  ? {
                      dateTimestamp: dateTimestampEWallet,
                      referenceId: referenceIdEWallet,
                    }
                  : {
                      dateTimestamp: dateTimestampPayLater,
                      referenceId: referenceIdPayLater,
                    };
              }

              return ewalletMoment.isAfter(paylaterMoment)
                ? {
                    dateTimestamp: dateTimestampEWallet,
                    referenceId: referenceIdEWallet,
                  }
                : {
                    dateTimestamp: dateTimestampPayLater,
                    referenceId: referenceIdPayLater,
                  };
            };

            const { dateTimestamp, referenceId } = findLatestTransaction();

            const from = moment(dateTimestamp)
              .subtract(1, 'day')
              .format('YYYY-MM-DD');

            const to = moment().format('YYYY-MM-DD');

            const transactionUrl = brickUrl(`/v1/transaction/list`);

            const transactionOptions = {
              method: 'GET',
              url: transactionUrl.href,
              params: { from, to },
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${eWalletAccount.accessToken}`,
              },
            };

            const {
              data: { data },
            }: { data: { data: BrickTransactionData[] } } = await axios.request(
              transactionOptions
            );

            const transactionData = _.sortBy(data, [
              'dateTimestamp',
              'reference_id',
            ]);

            const index = findBrickTransactionIndex(
              referenceId,
              transactionData
            );

            const newTransaction = transactionData.splice(
              index + 1,
              transactionData.length
            );

            if (newTransaction.length === 0)
              throw new Error(
                'Tidak ada transaksi baru untuk gopay wallet dan paylater untuk akun tersebut.'
              );

            for (let i = 0; i < newTransaction.length; i++) {
              const element = newTransaction[i];

              if (element.transaction_type === 'Wallet') {
                const obj = {
                  eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.eWalletTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `eWalletTransactionLive_${eWalletAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                eWalletTransactionToIterate.push(trans);
              } else {
                const obj = {
                  payLaterAccountId: encodePayLaterAccountId(
                    payLaterAccount.id
                  ),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.payLaterTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `payLaterTransactionLive_${payLaterAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                payLaterTransactionToIterate.push(trans);
              }
            }
          } else if (
            /**
             * We then run the algorithm if
             * only the gopay wallet is not null.
             * In other words, there is no existing
             * gopay pay later in our database.
             */
            dateTimestampEWallet !== null &&
            referenceIdEWallet !== null &&
            dateTimestampPayLater === null &&
            referenceIdPayLater === null
          ) {
            const dateTimestamp = dateTimestampEWallet;
            const referenceId = referenceIdEWallet;

            const from = moment(dateTimestamp)
              .subtract(1, 'day')
              .format('YYYY-MM-DD');

            const to = moment().format('YYYY-MM-DD');

            const transactionUrl = brickUrl(`/v1/transaction/list`);

            const transactionOptions = {
              method: 'GET',
              url: transactionUrl.href,
              params: { from, to },
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${eWalletAccount.accessToken}`,
              },
            };

            const {
              data: { data },
            }: { data: { data: BrickTransactionData[] } } = await axios.request(
              transactionOptions
            );

            const transactionData = _.sortBy(data, [
              'dateTimestamp',
              'reference_id',
            ]);

            const index = findBrickTransactionIndex(
              referenceId,
              transactionData
            );

            const newTransaction = transactionData.splice(
              index + 1,
              transactionData.length
            );

            if (newTransaction.length === 0)
              throw new Error(
                'Tidak ada transaksi baru untuk gopay wallet dan paylater untuk akun tersebut.'
              );

            for (let i = 0; i < newTransaction.length; i++) {
              const element = newTransaction[i];

              if (element.transaction_type === 'Wallet') {
                const obj = {
                  eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.eWalletTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `eWalletTransactionLive_${eWalletAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                eWalletTransactionToIterate.push(trans);
              } else {
                const obj = {
                  payLaterAccountId: encodePayLaterAccountId(
                    payLaterAccount.id
                  ),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.payLaterTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `payLaterTransactionLive_${payLaterAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                payLaterTransactionToIterate.push(trans);
              }
            }
          } else if (
            /**
             * We then run the algorithm if
             * only the gopay wallet is null.
             * In other words, there is no existing
             * gopay wallet in our database.
             */
            dateTimestampEWallet === null &&
            referenceIdEWallet === null &&
            dateTimestampPayLater !== null &&
            referenceIdPayLater !== null
          ) {
            const dateTimestamp = dateTimestampPayLater;
            const referenceId = referenceIdPayLater;

            const from = moment(dateTimestamp)
              .subtract(1, 'day')
              .format('YYYY-MM-DD');

            const to = moment().format('YYYY-MM-DD');

            const transactionUrl = brickUrl(`/v1/transaction/list`);

            const transactionOptions = {
              method: 'GET',
              url: transactionUrl.href,
              params: { from, to },
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${eWalletAccount.accessToken}`,
              },
            };

            const {
              data: { data },
            }: { data: { data: BrickTransactionData[] } } = await axios.request(
              transactionOptions
            );

            const transactionData = _.sortBy(data, [
              'dateTimestamp',
              'reference_id',
            ]);

            const index = findBrickTransactionIndex(
              referenceId,
              transactionData
            );

            const newTransaction = transactionData.splice(
              index + 1,
              transactionData.length
            );

            if (newTransaction.length === 0)
              throw new Error(
                'Tidak ada transaksi baru untuk gopay wallet dan paylater untuk akun tersebut.'
              );

            for (let i = 0; i < newTransaction.length; i++) {
              const element = newTransaction[i];

              if (element.transaction_type === 'Wallet') {
                const obj = {
                  eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.eWalletTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `eWalletTransactionLive_${eWalletAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                eWalletTransactionToIterate.push(trans);
              } else {
                const obj = {
                  payLaterAccountId: encodePayLaterAccountId(
                    payLaterAccount.id
                  ),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.payLaterTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `payLaterTransactionLive_${payLaterAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                payLaterTransactionToIterate.push(trans);
              }
            }
          } else {
            /**
             * This means that everything is null.
             * Which means there is no existing gopay wallet,
             * and gopay pay later in our database.
             */

            const from = moment().subtract(7, 'day').format('YYYY-MM-DD');

            const to = moment().format('YYYY-MM-DD');

            const transactionUrl = brickUrl(`/v1/transaction/list`);

            const transactionOptions = {
              method: 'GET',
              url: transactionUrl.href,
              params: { from, to },
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${eWalletAccount.accessToken}`,
              },
            };

            const {
              data: { data: newTransaction },
            }: { data: { data: BrickTransactionData[] } } = await axios.request(
              transactionOptions
            );

            if (newTransaction.length === 0)
              throw new Error(
                'Tidak ada transaksi baru untuk gopay wallet dan paylater untuk akun tersebut.'
              );

            for (let i = 0; i < newTransaction.length; i++) {
              const element = newTransaction[i];

              if (element.transaction_type === 'Wallet') {
                const obj = {
                  eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.eWalletTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `eWalletTransactionLive_${eWalletAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                eWalletTransactionToIterate.push(trans);
              } else {
                const obj = {
                  payLaterAccountId: encodePayLaterAccountId(
                    payLaterAccount.id
                  ),
                  transactionName: element.description,
                  dateTimestamp: new Date(
                    moment(element.dateTimestamp).add(
                      1,
                      'day'
                    ) as unknown as Date
                  ),
                  referenceId: element.reference_id,
                  currency: element.account_currency,
                  amount: `${element.amount}`,
                  onlineTransaction: false,
                  isReviewed: false,
                  merchantId: '63d8b775d3e050940af0caf1',
                  category: [
                    { name: 'UNDEFINED', amount: `${element.amount}` },
                  ],
                  transactionType: (element.direction === 'in'
                    ? 'INCOME'
                    : 'EXPENSE') as TransactionType,
                  direction: (element.direction === 'in'
                    ? 'IN'
                    : 'OUT') as DirectionType,
                  isSubscription: false,
                  description: element.description,
                  institutionId: mapBrickInstitutionIdToKudoku(11),
                  isHideFromBudget: false,
                  isHideFromInsight: false,
                };

                const trans = await prisma.payLaterTransaction.create({
                  data: obj,
                });

                await pubsub.publish(
                  `payLaterTransactionLive_${payLaterAccount.id}`,
                  {
                    mutationType: 'ADD',
                    transaction: trans,
                  }
                );

                payLaterTransactionToIterate.push(trans);
              }
            }
          }

          /**
           * Update balance after pulling new transaction
           */

          const accountDetail = await getAccountDetail(
            eWalletAccount.accessToken
          );

          const updatedEWalletAccount = await prisma.eWalletAccount.update({
            where: { id: eWalletAccount.id },
            data: {
              balance: accountDetail[0].balances.current.toString(),
              lastUpdate: new Date(),
            },
          });

          await pubsub.publish(
            `eWalletAccountUpdated_${updatedEWalletAccount.id}`,
            {
              eWalletAccountUpdate: updatedEWalletAccount,
            }
          );

          const updatedPayLaterAccount = await prisma.payLaterAccount.update({
            where: { id: payLaterAccount.id },
            data: {
              balance: accountDetail[1].balances.current.toString(),
              lastUpdate: new Date(),
            },
          });

          await pubsub.publish(
            `payLaterAccountUpdated_${updatedPayLaterAccount.id}`,
            {
              payLaterAccountUpdate: updatedPayLaterAccount,
            }
          );

          /**
           * Create data on the 'Refresh' collection
           */
          await prisma.refresh.create({
            data: {
              userId: user.id,
              date: new Date(),
            },
          });

          /**
           * Loop to comply to graphql type
           */

          let responseEWallet: any[] = [];
          let responsePayLater: any[] = [];

          for (let i = 0; i < eWalletTransactionToIterate.length; i++) {
            const element = eWalletTransactionToIterate[i];

            const merchant = await prisma.merchant.findFirstOrThrow({
              where: { id: element.merchantId },
            });

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              eWalletAccountId: decodeEWalletAccountId(
                element.eWalletAccountId
              ),
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

            responseEWallet.push(obj);
          }

          for (let i = 0; i < payLaterTransactionToIterate.length; i++) {
            const element = payLaterTransactionToIterate[i];

            const merchant = await prisma.merchant.findFirstOrThrow({
              where: { id: element.merchantId },
            });

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              payLaterAccountId: decodePayLaterAccountId(
                element.payLaterAccountId
              ),
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

            responsePayLater.push(obj);
          }

          return {
            EWallet: responseEWallet,
            PayLater: responsePayLater,
          };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('editEWalletTransaction', {
      type: 'EWalletTransaction',
      description: 'Edit a particular e-wallet transaction',
      args: {
        transactionId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that transaction',
          })
        ),

        transactionName: arg({
          type: 'String',
          description: 'The transaction name',
        }),

        onlineTransaction: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is online',
        }),

        merchantId: arg({
          type: 'String',
          description: 'The merchant id',
        }),

        category: arg({
          type: list('NameAmountJsonInput'),
          description: 'The category of the transaction',
        }),

        transactionType: arg({
          type: 'ExpenseTypeEnum',
          description:
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction.',
        }),

        isSubscription: arg({
          type: 'Boolean',
          description: 'Wether or not this transaction is a subscription',
        }),

        notes: arg({
          type: 'String',
          description: 'Notes for this transaction',
        }),

        location: arg({
          type: 'LocationInputType',
          description: 'The location for this transaction',
        }),

        tags: arg({
          type: list('NameAmountJsonInput'),
          description: 'The tags for this transaction',
        }),

        isHideFromBudget: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from budget. default: false',
          default: false,
        }),

        isHideFromInsight: arg({
          type: nonNull('Boolean'),
          description:
            'Whether or not this transaction is hide from insight. default: false',
          default: false,
        }),
      },

      async resolve(
        __,
        {
          transactionId,
          onlineTransaction,
          merchantId,
          category,
          transactionType,
          transactionName,
          isSubscription,
          notes,
          location,
          tags,
          isHideFromBudget,
          isHideFromInsight,
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          if (
            !onlineTransaction &&
            !merchantId &&
            !category &&
            !transactionName &&
            !transactionType &&
            !isSubscription &&
            !notes &&
            !location &&
            !tags &&
            !isHideFromBudget &&
            !isHideFromInsight
          )
            throw new Error('Semua value tidak boleh null atau undefined.');

          const transaction = await prisma.eWalletTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          const { amount, eWalletAccountId: _eWalletAccountId } = transaction;

          const eWalletAccountId = decodeEWalletAccountId(_eWalletAccountId);

          if (category) {
            let categorySum: number = 0;

            for (let i = 0; i < category.length; i++) {
              const element = category[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.'
                );

              categorySum += Number(element.amount);
            }

            if (categorySum !== Number(amount))
              throw new Error(
                'Total amount kategori harus sama dengan amount transaksi.'
              );
          }

          if (tags) {
            let tagsSum: number = 0;

            for (let i = 0; i < tags.length; i++) {
              const element = tags[i];

              if (
                !element ||
                !element.hasOwnProperty('name') ||
                !element.hasOwnProperty('amount')
              )
                throw new Error(
                  'Tags harus dalam format {name, amount} untuk tiap tags.'
                );

              tagsSum += Number(element.amount);
            }

            if (tagsSum > Number(amount))
              throw new Error(
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.'
              );
          }

          const response = await prisma.eWalletTransaction.update({
            where: { id: transaction.id },
            data: {
              onlineTransaction:
                onlineTransaction ?? transaction.onlineTransaction,
              transactionName: transactionName ?? transaction.transactionName,
              merchantId: merchantId ?? transaction.merchantId,
              category: category ?? transaction.category,
              transactionType: transactionType ?? transaction.transactionType,
              isSubscription: isSubscription ?? transaction.isSubscription,
              notes: notes ?? transaction.notes,
              location: location ?? transaction.location,
              tags: tags ?? transaction.tags,
              isHideFromBudget:
                isHideFromBudget ?? transaction.isHideFromBudget,
              isHideFromInsight:
                isHideFromInsight ?? transaction.isHideFromInsight,
              isReviewed: true,
            },
          });

          await pubsub.publish(`eWalletTransactionLive_${eWalletAccountId}`, {
            mutationType: 'EDIT',
            transaction: response,
          });

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            transactionName: response.transactionName,
            eWalletAccountId,
            dateTimestamp: response.dateTimestamp,
            referenceId: response.referenceId,
            institutionId: response.institutionId,
            currency: response.currency,
            amount: response.amount,
            onlineTransaction: response.onlineTransaction,
            isReviewed: response.isReviewed,
            merchant: merchant,
            merchantId: response.merchantId,
            category: response.category as
              | { amount: string; name: string }[]
              | null
              | undefined,
            transactionType: response.transactionType,
            description: response.description,
            internalTransferTransactionId:
              response.internalTransferTransactionId,
            direction: response.direction,
            notes: response.notes,
            location: response.location,
            tags: response.tags as
              | { amount: string; name: string }[]
              | null
              | undefined,
            isSubscription: response.isSubscription,
            isHideFromBudget: response.isHideFromBudget,
            isHideFromInsight: response.isHideFromInsight,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
