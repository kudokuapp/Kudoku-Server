import { arg, extendType, list, nonNull } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { findBrickTransactionIndex } from '../../../utils/transaction';
import {
  accessTokenIsExpired,
  brickPublicAccessToken,
  brickUrl,
  getAccountDetail,
  mapBrickInstitutionIdToKudoku,
} from '../../../utils/brick';
import axios, { AxiosError } from 'axios';
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
import {
  decodeEWalletAccountId,
  decodePayLaterAccountId,
  encodeEWalletAccountId,
  encodePayLaterAccountId,
} from '../../../utils/auth';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';

export const EWalletAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.list.nonNull.field('connectGopayViaBrick', {
      type: 'EWalletAccount',
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

      async resolve(parent, args, context, info) {
        const {
          username,
          otp,
          otpToken,
          uniqueId,
          sessionId,
          clientId,
          redirectRefId,
        } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

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
        }: { data: { data: BrickTokenData } } = await axios
          .request(options)
          .catch((e: AxiosError) => {
            throw { status: Number(`8${e.code}`), message: e.message };
          });

        const accountDetail = await getAccountDetail(data.accessToken).catch(
          (e: AxiosError) => {
            throw { status: Number(`8${e.code}`), message: e.message };
          }
        );

        /**
         * Wallet = accountDetail[0]
         * Paylater = accountDetail[1]
         */

        /*
        Avoid same account duplication
        */
        const walletAccountSearch = await prisma.eWalletAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[0].accountNumber },
              { userId },
            ],
          },
        });

        const paylaterAccountSearch = await prisma.eWalletAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[1].accountNumber },
              { userId },
            ],
          },
        });

        if (walletAccountSearch || paylaterAccountSearch)
          throw { status: 5000, message: 'Akun e-wallet sudah ada.' };

        const walletAccount = await prisma.eWalletAccount.create({
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

        const paylaterAccount = await prisma.payLaterAccount.create({
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

        /*
        Pull the initial transaction for the month
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
        }: { data: { data: BrickTransactionData[] } } = await axios
          .request(transactionOptions)
          .catch((e: AxiosError) => {
            throw { status: Number(`8${e.code}`), message: e.message };
          });

        for (let i = 0; i < transactionData.length; i++) {
          const element = transactionData[i];

          if (element.transaction_type === 'Wallet') {
            const obj = {
              eWalletAccountId: encodeEWalletAccountId(walletAccount.id),
              transactionName: element.description,
              dateTimestamp: new Date(
                moment(element.dateTimestamp).add(1, 'day') as unknown as Date
              ),
              referenceId: element.reference_id,
              currency: element.account_currency,
              amount: element.amount.toString(),
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [
                { name: 'UNDEFINED', amount: element.amount.toString() },
              ],
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
              payLaterAccountId: encodePayLaterAccountId(paylaterAccount.id),
              transactionName: element.description,
              dateTimestamp: new Date(
                moment(element.dateTimestamp).add(1, 'day') as unknown as Date
              ),
              referenceId: element.reference_id,
              currency: element.account_currency,
              amount: element.amount.toString(),
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [
                { name: 'UNDEFINED', amount: element.amount.toString() },
              ],
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

        return [
          {
            id: walletAccount.id,
            userId: walletAccount.userId,
            institutionId: walletAccount.institutionId,
            accountNumber: walletAccount.accountNumber,
            balance: walletAccount.balance,
            createdAt: toTimeStamp(walletAccount.createdAt),
            lastUpdate: toTimeStamp(walletAccount.lastUpdate),
            currency: walletAccount.currency,
          },
          {
            id: paylaterAccount.id,
            userId: paylaterAccount.userId,
            institutionId: paylaterAccount.institutionId,
            accountNumber: paylaterAccount.accountNumber,
            balance: paylaterAccount.balance,
            createdAt: toTimeStamp(paylaterAccount.createdAt),
            lastUpdate: toTimeStamp(paylaterAccount.lastUpdate),
            currency: paylaterAccount.currency,
          },
        ];
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

      async resolve(parent, args, context, info) {
        const { eWalletAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const eWalletAccount = await prisma.eWalletAccount.findFirst({
          where: { AND: [{ id: eWalletAccountId }, { userId: user.id }] },
        });

        if (!eWalletAccount)
          throw { status: 5100, message: 'Akun e-wallet tidak ditemukan.' };

        const payLaterAccount = await prisma.payLaterAccount.findFirst({
          where: {
            AND: [
              { accessToken: eWalletAccount.accessToken },
              { userId: user.id },
            ],
          },
        });

        if (!payLaterAccount)
          throw { status: 5500, message: 'Akun pay later tidak ditemukan.' };

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

        const payLaterTransaction = await prisma.payLaterTransaction.findMany();

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
      },
    });
  },
});

export const EWalletTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('refreshGopayTransactionViaBrick', {
      type: 'ResponseMessage',
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

      async resolve(parent, args, context, info) {
        const { eWalletAccountId, payLaterAccountId } = args;

        if (!eWalletAccountId && !payLaterAccountId)
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        let accessToken: string;
        let eWalletAccount: EWalletAccount;
        let payLaterAccount: PayLaterAccount;

        if (eWalletAccountId !== null && eWalletAccountId !== undefined) {
          const eWalletAccountSearch = await prisma.eWalletAccount.findFirst({
            where: { id: eWalletAccountId },
          });

          if (!eWalletAccountSearch)
            throw { status: 5100, message: 'Akun e-wallet tidak ditemukan.' };

          const payLaterAccountSearch = await prisma.payLaterAccount.findFirst({
            where: { accessToken: eWalletAccountSearch.accessToken },
          });

          if (!payLaterAccountSearch)
            throw { status: 9000, message: 'Akun pay later tidak ditemukan.' };

          eWalletAccount = eWalletAccountSearch;
          payLaterAccount = payLaterAccountSearch;
          accessToken = eWalletAccountSearch.accessToken;
        } else {
          if (payLaterAccountId === null || payLaterAccountId === undefined)
            throw {
              status: 2003,
              message: 'Semua value tidak boleh null atau undefined.',
            };

          const payLaterAccountSearch = await prisma.payLaterAccount.findFirst({
            where: { id: payLaterAccountId },
          });

          if (!payLaterAccountSearch)
            throw { status: 9000, message: 'Akun pay later tidak ditemukan.' };

          const eWalletAccountSearch = await prisma.eWalletAccount.findFirst({
            where: { accessToken: payLaterAccountSearch.accessToken },
          });

          if (!eWalletAccountSearch)
            throw { status: 5100, message: 'Akun e-wallet tidak ditemukan.' };

          eWalletAccount = eWalletAccountSearch;
          payLaterAccount = payLaterAccountSearch;
          accessToken = payLaterAccountSearch.accessToken;
        }

        /**
         * Check if the access token expired or not
         */

        const expired = await accessTokenIsExpired(accessToken);

        if (expired) {
          await prisma.eWalletAccount.update({
            where: { id: eWalletAccount.id },
            data: { expired: true },
          });
          await prisma.payLaterAccount.update({
            where: { id: payLaterAccount.id },
            data: { expired: true },
          });
          throw {
            status: 5200,
            message:
              'Access token gopay via Brick untuk e-wallet akun dan paylater akun sudah expired.',
          };
        }

        const eWalletTransactionAll = await prisma.eWalletTransaction.findMany({
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        const payLaterTransactionAll =
          await prisma.payLaterTransaction.findMany({
            orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
          });

        let eWalletTransaction: EWalletTransaction[] = [];
        let payLaterTransaction: PayLaterTransaction[] = [];

        for (let i = 0; i < eWalletTransactionAll.length; i++) {
          const element = eWalletTransactionAll[i];

          const decodedEWalletAccountId = decodeEWalletAccountId(
            element.eWalletAccountId
          );

          if (decodedEWalletAccountId === eWalletAccount.id) {
            eWalletTransaction.push(element);
          }
        }

        for (let i = 0; i < payLaterTransactionAll.length; i++) {
          const element = payLaterTransactionAll[i];

          const decodedEWalletAccountId = decodeEWalletAccountId(
            element.payLaterAccountId
          );

          if (decodedEWalletAccountId === eWalletAccount.id) {
            payLaterTransaction.push(element);
          }
        }

        const {
          dateTimestamp: dateTimestampEWallet,
          referenceId: referenceIdEWallet,
        } = eWalletTransaction[0];

        const {
          dateTimestamp: dateTimestampPayLater,
          referenceId: referenceIdPayLater,
        } = payLaterTransaction[0];

        const findLatestTransaction = () => {
          const getReferenceNumber = (referenceId: string) => {
            const regex = /[^-]+$/;
            const referenceIdRegex = referenceId.match(regex);
            const referenceIdNum = referenceIdRegex
              ? Number(referenceIdRegex[0])
              : 0;
            return referenceIdNum;
          };

          if (!dateTimestampEWallet && !dateTimestampPayLater) {
            throw {
              status: 5300,
              message:
                'Transaksi e-wallet dan transaksi paylater dua-duanya null.',
            };
          }

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
        }: { data: { data: BrickTransactionData[] } } = await axios
          .request(transactionOptions)
          .catch((e) => {
            throw new Error(e);
          });

        const transactionData = _.sortBy(data, [
          'dateTimestamp',
          'reference_id',
        ]);

        const index = findBrickTransactionIndex(referenceId, transactionData);

        const newTransaction = transactionData.splice(
          index + 1,
          transactionData.length
        );

        if (newTransaction.length === 0)
          throw {
            status: 5400,
            message:
              'Tidak ada transaksi baru untuk gopay wallet dan paylater untuk akun tersebut.',
          };

        for (let i = 0; i < newTransaction.length; i++) {
          const element = newTransaction[i];

          if (element.transaction_type === 'Wallet') {
            const obj = {
              eWalletAccountId: encodeEWalletAccountId(eWalletAccount.id),
              transactionName: element.description,
              dateTimestamp: new Date(
                moment(element.dateTimestamp).add(1, 'day') as unknown as Date
              ),
              referenceId: element.reference_id,
              currency: element.account_currency,
              amount: element.amount.toString(),
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [
                { name: 'UNDEFINED', amount: element.amount.toString() },
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
              amount: element.amount.toString(),
              onlineTransaction: false,
              isReviewed: false,
              merchantId: '63d8b775d3e050940af0caf1',
              category: [
                { name: 'UNDEFINED', amount: element.amount.toString() },
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

            await prisma.payLaterTransaction.create({ data: obj });
          }
        }

        /*
        Update balance after pulling new transaction
        */
        const accountDetail = await getAccountDetail(
          eWalletAccount.accessToken
        ).catch((e: AxiosError) => {
          throw { status: Number(`8${e.code}`), message: e.message };
        });

        await prisma.eWalletAccount.update({
          where: { id: eWalletAccount.id },
          data: {
            balance: accountDetail[0].balances.current.toString(),
            lastUpdate: new Date(),
          },
        });

        await prisma.payLaterAccount.update({
          where: { id: payLaterAccount.id },
          data: {
            balance: accountDetail[1].balances.current.toString(),
            lastUpdate: new Date(),
          },
        });

        /*
        Create data on the 'Refresh' collection
        */
        await prisma.refresh.create({
          data: {
            userId: user.id,
            date: new Date(),
          },
        });

        return {
          response: `Successfully create ${newTransaction.length} new transaction and update new balance`,
        };
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

      async resolve(parent, args, context, info) {
        const {
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
        } = args;

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
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.eWalletTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { amount } = transaction;

        if (category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (
              !element ||
              !element.hasOwnProperty('name') ||
              !element.hasOwnProperty('amount')
            )
              throw {
                status: 2300,
                message:
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.',
              };

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw {
              status: 2200,
              message:
                'Total amount kategori harus sama dengan amount transaksi.',
            };
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
              throw {
                status: 2301,
                message:
                  'Tags harus dalam format {name, amount} untuk tiap tags.',
              };

            tagsSum += Number(element.amount);
          }

          if (tagsSum > Number(amount))
            throw {
              status: 2201,
              message:
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.',
            };
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
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
            isReviewed: true,
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        return {
          id: response.id,
          transactionName: response.transactionName,
          eWalletAccountId: decodeEWalletAccountId(response.eWalletAccountId),
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          referenceId: response.referenceId,
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          onlineTransaction: response.onlineTransaction,
          isReviewed: response.isReviewed,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          internalTransferTransactionId: response.internalTransferTransactionId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          isSubscription: response.isSubscription,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
      },
    });

    t.nonNull.field('editPayLaterTransaction', {
      type: 'PayLaterTransaction',
      description: 'Edit a particular pay later transaction',
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

      async resolve(parent, args, context, info) {
        const {
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
        } = args;

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
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.payLaterTransaction.findFirst({
          where: { id: transactionId },
        });

        if (!transaction)
          throw { status: 2500, message: 'Transaksi tidak ditemukan.' };

        const { amount } = transaction;

        if (category) {
          let categorySum: number = 0;

          for (let i = 0; i < category.length; i++) {
            const element = category[i];

            if (
              !element ||
              !element.hasOwnProperty('name') ||
              !element.hasOwnProperty('amount')
            )
              throw {
                status: 2300,
                message:
                  'Category tidak boleh kosong. Dan harus dalam format {name, amount} untuk tiap category.',
              };

            categorySum += Number(element.amount);
          }

          if (categorySum !== Number(amount))
            throw {
              status: 2200,
              message:
                'Total amount kategori harus sama dengan amount transaksi.',
            };
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
              throw {
                status: 2301,
                message:
                  'Tags harus dalam format {name, amount} untuk tiap tags.',
              };

            tagsSum += Number(element.amount);
          }

          if (tagsSum > Number(amount))
            throw {
              status: 2201,
              message:
                'Total amount tags tidak boleh lebih besar dengan amount transaksi.',
            };
        }

        const response = await prisma.payLaterTransaction.update({
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
            isHideFromBudget: isHideFromBudget ?? transaction.isHideFromBudget,
            isHideFromInsight:
              isHideFromInsight ?? transaction.isHideFromInsight,
            isReviewed: true,
          },
        });

        const merchant = await prisma.merchant.findFirst({
          where: { id: response.merchantId },
        });

        if (!merchant)
          throw { status: 2400, message: 'Merchant tidak ditemukan.' };

        return {
          id: response.id,
          transactionName: response.transactionName,
          payLaterAccountId: decodePayLaterAccountId(
            response.payLaterAccountId
          ),
          dateTimestamp: toTimeStamp(response.dateTimestamp),
          referenceId: response.referenceId,
          institutionId: response.institutionId,
          currency: response.currency,
          amount: response.amount,
          onlineTransaction: response.onlineTransaction,
          isReviewed: response.isReviewed,
          merchant: merchant,
          merchantId: response.merchantId,
          category: response.category as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          transactionType: response.transactionType,
          description: response.description,
          internalTransferTransactionId: response.internalTransferTransactionId,
          direction: response.direction,
          notes: response.notes,
          location: response.location,
          tags: response.tags as MaybePromise<
            { amount: string; name: string }[] | null | undefined
          >,
          isSubscription: response.isSubscription,
          isHideFromBudget: response.isHideFromBudget,
          isHideFromInsight: response.isHideFromInsight,
        };
      },
    });
  },
});
