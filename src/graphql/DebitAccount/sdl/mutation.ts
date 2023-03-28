import { arg, extendType, list, nonNull } from 'nexus';
import axios from 'axios';
import moment from 'moment';
import {
  DebitTransaction,
  DirectionType,
  TransactionType,
} from '@prisma/client';
import _ from 'lodash';
import getClientIdandRedirectRefId from '../../../utils/brick/getClientIdandRedirectRefId';
import brickUrl from '../../../utils/brick/url';
import brickPublicAccessToken from '../../../utils/brick/publicAccessToken';
import getAccountDetail from '../../../utils/brick/getAccountDetail';
import mapBrickInstitutionIdToKudoku from '../../../utils/brick/mapBrickInstitutionIdToKudoku';
import {
  decodeDebitAccountId,
  encodeDebitAccountId,
} from '../../../utils/auth/debitAccountId';
import isAccessTokenIsExpired from '../../../utils/brick/isAccessTokenExpired';
import findBrickTransactionIndex from '../../../utils/transaction/findBrickTransactionIndex';

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

      async resolve(
        __,
        { brickInstitutionId, username, password },
        { userId, prisma },
        ___
      ) {
        try {
          if (
            brickInstitutionId !== 2 &&
            brickInstitutionId !== 37 &&
            brickInstitutionId !== 38
          )
            throw new Error('Brick Institution ID yang tidak valid untuk BCA.');

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const { clientId, redirectRefId } = await getClientIdandRedirectRefId(
            userId
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
              institutionId: brickInstitutionId,
              username,
              password,
              redirectRefId,
            },
          };

          const {
            data: { data },
          }: { data: { data: BrickTokenData } } = await axios.request(options);

          const accountDetail = await getAccountDetail(data.accessToken);

          /**
           * Avoid same debit account duplication
           */
          const searchDebitAccount = await prisma.debitAccount.findFirst({
            where: {
              AND: [
                { accountNumber: accountDetail[0].accountNumber },
                { userId: user.id },
              ],
            },
          });

          if (searchDebitAccount) throw new Error('Akun debit sudah ada.');

          const debitAccount = await prisma.debitAccount.create({
            data: {
              userId: user.id,
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

          /**
           * Pull the initial transaction for the month
           * We pull 7 days before only
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

            const obj = {
              debitAccountId: encodeDebitAccountId(debitAccount.id),
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
            createdAt: debitAccount.createdAt,
            lastUpdate: debitAccount.lastUpdate,
            currency: debitAccount.currency,
            expired: debitAccount.expired,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { debitAccountId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findFirstOrThrow({
            where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
          });

          await prisma.debitAccount.delete({ where: { id: debitAccount.id } });

          const transaction = await prisma.debitTransaction.findMany();

          let count = 0;

          for (let i = 0; i < transaction.length; i++) {
            const element = transaction[i];

            const decodedDebitAccountId = decodeDebitAccountId(
              element.debitAccountId
            ) as unknown as string;

            if (decodedDebitAccountId === debitAccount.id) {
              await prisma.debitTransaction.delete({
                where: { id: element.id },
              });
              count += 1;
            }
          }

          return {
            response: `Successfully delete debit account with id ${debitAccountId} and all ${count} transaction`,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { debitAccountId }, { userId, prisma, pubsub }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const debitAccount = await prisma.debitAccount.findFirstOrThrow({
            where: { AND: [{ id: debitAccountId }, { userId: user.id }] },
          });

          const expired = await isAccessTokenIsExpired(
            debitAccount.accessToken
          );

          if (expired) {
            const expiredDebitAccount = await prisma.debitAccount.update({
              where: { id: debitAccount.id },
              data: { expired: true },
            });
            await pubsub.publish(`debitAccountUpdated_${debitAccount.id}`, {
              debitAccountUpdate: expiredDebitAccount,
            });
            throw new Error(
              'Access token Brick untuk debit akun sudah expired.'
            );
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

          let newTransaction: BrickTransactionData[] = [];

          if (debitTransaction.length === 0) {
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
                Authorization: `Bearer ${debitAccount.accessToken}`,
              },
            };

            const {
              data: { data },
            }: { data: { data: BrickTransactionData[] } } = await axios.request(
              transactionOptions
            );

            newTransaction = [...data];
          } else {
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

            const newestTransaction = transactionData.splice(
              index + 1,
              transactionData.length
            );

            if (newestTransaction.length === 0)
              throw new Error(
                'Tidak ada transaksi baru untuk debit akun tersebut.'
              );

            newTransaction = [...newestTransaction];
          }

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
                institutionId: debitAccount.institutionId,
                isHideFromBudget: false,
                isHideFromInsight: false,
                transactionMethod: 'UNDEFINED',
              },
            });

            await pubsub.publish(`debitTransactionLive_${debitAccount.id}`, {
              mutationType: 'ADD',
              transaction: trans,
            });

            responseToIterate.push(trans);
          }

          /**
           * Update balance after pulling new transaction
           */
          const accountDetail = await getAccountDetail(
            debitAccount.accessToken
          );

          const updatedDebitAccount = await prisma.debitAccount.update({
            where: { id: debitAccount.id },
            data: {
              balance: accountDetail[0].balances.current.toString(),
              lastUpdate: new Date(),
            },
          });

          await pubsub.publish(`debitAccountUpdated_${debitAccount.id}`, {
            debitAccountUpdate: updatedDebitAccount,
          });

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
           * Iterating to comply with graphql type
           */
          if (responseToIterate.length === 0) {
            return null;
          } else {
            let response: any[] = [];
            for (let i = 0; i < responseToIterate.length; i++) {
              const element = responseToIterate[i];

              const merchant = await prisma.merchant.findFirstOrThrow({
                where: { id: element.merchantId },
              });

              const obj = {
                id: element.id,
                transactionName: element.transactionName,
                debitAccountId: decodeDebitAccountId(
                  element.debitAccountId
                ) as unknown as string,
                dateTimestamp: element.dateTimestamp,
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
        } catch (error) {
          throw error;
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
          transactionMethod,
        },
        { userId, prisma, pubsub },
        ___
      ) {
        try {
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
            throw new Error('Semua value tidak boleh null atau undefined.');

          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const transaction = await prisma.debitTransaction.findFirstOrThrow({
            where: { id: transactionId },
          });

          const { amount, debitAccountId: _debitAccountId } = transaction;

          const decodedDebitAccountId = decodeDebitAccountId(_debitAccountId);

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
              isHideFromBudget:
                isHideFromBudget ?? transaction.isHideFromBudget,
              isHideFromInsight:
                isHideFromInsight ?? transaction.isHideFromInsight,
              transactionMethod:
                transactionMethod ?? transaction.transactionMethod,
              isReviewed: true,
            },
          });

          await pubsub.publish(
            `debitTransactionLive_${decodedDebitAccountId}`,
            {
              mutationType: 'EDIT',
              transaction: response,
            }
          );

          const merchant = await prisma.merchant.findFirstOrThrow({
            where: { id: response.merchantId },
          });

          return {
            id: response.id,
            transactionName: response.transactionName,
            debitAccountId: decodedDebitAccountId,
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
            transactionMethod: response.transactionMethod,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
