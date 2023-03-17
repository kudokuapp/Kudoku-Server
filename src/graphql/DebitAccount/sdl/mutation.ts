import { arg, extendType, list, nonNull } from 'nexus';
import { toTimeStamp } from '../../../utils/date';
import { findBrickTransactionIndex } from '../../../utils/transaction';
import {
  brickUrl,
  getClientIdandRedirectRefId,
  brickPublicAccessToken,
  mapBrickInstitutionIdToKudoku,
  getAccountDetail,
  accessTokenIsExpired,
} from '../../../utils/brick';
import axios, { Axios, AxiosError } from 'axios';
import moment from 'moment';
import {
  DebitTransaction,
  DirectionType,
  TransactionType,
} from '@prisma/client';
import _ from 'lodash';
import {
  decodeDebitAccountId,
  encodeDebitAccountId,
} from '../../../utils/auth';
import { MaybePromise } from 'nexus/dist/typegenTypeHelpers';

export const DebitAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('connectBcaViaBrick', {
      type: 'DebitAccount',
      description: 'Connect debit card account via BRICK.',
      args: {
        brickInstitutionId: nonNull(
          arg({
            type: 'Int',
            description: 'The BRICK institution Id.',
          })
        ),
        username: nonNull(
          arg({
            type: 'String',
            description: 'The username for the particular bank details',
          })
        ),
        password: nonNull(
          arg({
            type: 'String',
            description: 'The password for the particular bank details',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { brickInstitutionId, username, password } = args;
        const { userId, prisma } = context;

        if (
          brickInstitutionId !== 2 &&
          brickInstitutionId !== 37 &&
          brickInstitutionId !== 38
        )
          throw {
            status: 4001,
            message: 'Brick Institution ID yang tidak valid untuk BCA.',
          };

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const searchUser = await prisma.user.findFirst({
          where: { id: userId },
        });

        if (!searchUser) {
          throw { status: 1000, message: 'User tidak ditemukan.' };
        }

        const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
          userId
        ).catch((e: AxiosError) => {
          throw { status: Number(`8${e.code}`), message: e.message };
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
            institutionId: brickInstitutionId,
            username,
            password,
            redirectRefId,
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

        /*
        Avoid same debit account duplication
        */
        const searchDebitAccount = await prisma.debitAccount.findFirst({
          where: {
            AND: [
              { accountNumber: accountDetail[0].accountNumber },
              { userId: searchUser.id },
            ],
          },
        });

        if (searchDebitAccount)
          throw { status: 4000, message: 'Akun debit sudah ada.' };

        const debitAccount = await prisma.debitAccount.create({
          data: {
            userId: searchUser.id,
            institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
            accountNumber: accountDetail[0].accountNumber,
            accessToken: data.accessToken,
            balance: accountDetail[0].balances.available.toString(),
            createdAt: new Date(),
            lastUpdate: new Date(),
            currency: accountDetail[0].currency,
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

          const obj = {
            debitAccountId: encodeDebitAccountId(debitAccount.id),
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
            institutionId: mapBrickInstitutionIdToKudoku(brickInstitutionId),
            isHideFromBudget: false,
            isHideFromInsight: false,
            transactionMethod: 'UNDEFINED',
          };

          await prisma.debitTransaction.create({ data: obj });
        }

        return {
          id: debitAccount.id,
          userId: debitAccount.userId,
          institutionId: debitAccount.institutionId,
          accountNumber: debitAccount.accountNumber,
          accessToken: debitAccount.accessToken,
          balance: debitAccount.balance,
          createdAt: toTimeStamp(debitAccount.createdAt),
          lastUpdate: toTimeStamp(debitAccount.lastUpdate),
          currency: debitAccount.currency,
        };
      },
    });

    t.field('deleteDebitAccount', {
      type: 'ResponseMessage',
      description: 'Delete debit account',

      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The debit account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { debitAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const debitAccount = await prisma.debitAccount.findFirst({
          where: { AND: [{ id: debitAccountId }, { userId }] },
        });

        if (!debitAccount)
          throw { status: 4000, message: 'Akun debit tidak ditemukan.' };

        await prisma.debitAccount.delete({ where: { id: debitAccount.id } });

        const transaction = await prisma.debitTransaction.findMany();

        let count = 0;

        for (let i = 0; i < transaction.length; i++) {
          const element = transaction[i];

          const decodedDebitAccountId = decodeDebitAccountId(
            element.debitAccountId
          ) as unknown as string;

          if (decodedDebitAccountId === debitAccount.id) {
            await prisma.debitTransaction.delete({ where: { id: element.id } });
            count += 1;
          }
        }

        return {
          response: `Successfully delete debit account with id ${debitAccountId} and all ${count} transaction`,
        };
      },
    });
  },
});

export const DebitTransactionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.list.field('refreshBcaTransactionViaBrick', {
      type: 'DebitTransaction',
      description:
        'Update transaction and balance for a particular debit account',
      args: {
        debitAccountId: nonNull(
          arg({
            type: 'String',
            description: 'The associated id of that debit account id',
          })
        ),
      },

      async resolve(parent, args, context, info) {
        const { debitAccountId } = args;

        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const debitAccount = await prisma.debitAccount.findFirst({
          where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
        });

        if (!debitAccount)
          throw { status: 4000, message: 'Akun debit tidak ditemukan.' };

        const expired = await accessTokenIsExpired(debitAccount.accessToken);

        if (expired) {
          await prisma.debitAccount.update({
            where: { id: debitAccount.id },
            data: { expired: true },
          });
          throw {
            status: 4200,
            message: 'Access token Brick untuk debit akun sudah expired.',
          };
        }

        /**
         * First, we find All Transactions
         */
        const allTransactions = await prisma.debitTransaction.findMany({
          orderBy: [{ dateTimestamp: 'desc' }, { referenceId: 'desc' }],
        });

        /**
         * Then, we loop over to find the transactions that has
         * matching DebitAccountId.
         */

        const debitTransaction: DebitTransaction[] = [];

        for (let i = 0; i < allTransactions.length; i++) {
          const element = allTransactions[i];

          const decodedDebitAccountId = decodeDebitAccountId(
            element.debitAccountId
          ) as unknown as string;

          if (debitAccount.id === decodedDebitAccountId) {
            debitTransaction.push(element);
          }
        }

        const { dateTimestamp, referenceId } = debitTransaction[0];

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
            Authorization: `Bearer ${debitAccount.accessToken}`,
          },
        };

        const {
          data: { data },
        }: { data: { data: BrickTransactionData[] } } = await axios
          .request(transactionOptions)
          .catch((e: AxiosError) => {
            throw { status: Number(`8${e.code}`), message: e.message };
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
            status: 4300,
            message: 'Tidak ada transaksi baru untuk debit akun tersebut.',
          };

        let responseToIterate: DebitTransaction[] = [];

        for (let i = 0; i < newTransaction.length; i++) {
          const element = newTransaction[i];

          const trans = await prisma.debitTransaction.create({
            data: {
              debitAccountId: encodeDebitAccountId(debitAccount.id),
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
              institutionId: debitAccount.institutionId,
              isHideFromBudget: false,
              isHideFromInsight: false,
              transactionMethod: 'UNDEFINED',
            },
          });

          responseToIterate.push(trans);
        }

        /*
        Update balance after pulling new transaction
        */
        const accountDetail = await getAccountDetail(
          debitAccount.accessToken
        ).catch((e: AxiosError) => {
          throw { status: Number(`8${e.code}`), message: e.message };
        });

        await prisma.debitAccount.update({
          where: { id: debitAccount.id },
          data: {
            balance: accountDetail[0].balances.current.toString(),
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

        /*
        Iterating to comply with graphql type
        */

        if (responseToIterate.length === 0) {
          return null;
        } else {
          let response: any[] = [];
          for (let i = 0; i < responseToIterate.length; i++) {
            const element = responseToIterate[i];

            const merchant = await prisma.merchant.findFirst({
              where: { id: element.merchantId },
            });

            const obj = {
              id: element.id,
              transactionName: element.transactionName,
              debitAccountId: decodeDebitAccountId(
                element.debitAccountId
              ) as unknown as string,
              dateTimestamp: toTimeStamp(element.dateTimestamp),
              referenceId: element.referenceId,
              institutionId: element.institutionId,
              currency: element.currency,
              amount: element.amount,
              onlineTransaction: element.onlineTransaction,
              isReviewed: element.isReviewed,
              merchant: merchant,
              merchantId: element.merchantId,
              category: element.category,
              transactionType: element.transactionType,
              description: element.description,
              internalTransferTransactionId:
                element.internalTransferTransactionId,
              direction: element.direction,
              notes: element.notes,
              location: element.location,
              tags: element.tags,
              isSubscription: element.isSubscription,
              isHideFromBudget: element.isHideFromBudget,
              isHideFromInsight: element.isHideFromInsight,
              transactionMethod: element.transactionMethod,
            };

            response.push(obj);
          }

          return response;
        }
      },
    });

    t.nonNull.field('editDebitTransaction', {
      type: 'DebitTransaction',
      description: 'Edit a particular debit transaction',
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
            'The transaction type. Either INCOME for in transation, EXPENSE for outgoing transaction, and TRANSFER for internal transfer.',
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

        transactionMethod: arg({
          type: 'TransactionMethodEnum',
          description: 'What transaction method is this.',
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
          transactionMethod,
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
          !isHideFromInsight &&
          !transactionMethod
        )
          throw {
            status: 2003,
            message: 'Semua value tidak boleh null atau undefined.',
          };
        const { userId, prisma } = context;

        if (!userId) throw { status: 1100, message: 'Token tidak valid.' };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const transaction = await prisma.debitTransaction.findFirst({
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

        const response = await prisma.debitTransaction.update({
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
            transactionMethod:
              transactionMethod ?? transaction.transactionMethod,
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
          debitAccountId: decodeDebitAccountId(response.debitAccountId),
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
          transactionMethod: response.transactionMethod,
        };
      },
    });
  },
});
