import { arg, extendType, idArg, nonNull, stringArg } from 'nexus';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload, OTP_SECRET, APP_SECRET } from '../../../utils/auth';
import { cleanDate, toTimeStamp } from '../../../utils/date';

export const CashAccountMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addCashAccount', {
      type: 'CashAccount',
      description: 'Create a new cash account.',
      args: {
        accountName: nonNull(
          arg({
            type: 'String',
            description:
              'The account name of the cash account that user created. Default to "Cash"',
            default: 'Cash',
          })
        ),
        displayPicture: arg({
          type: 'String',
          description: 'The icon or display picture of that account',
        }),
        startingBalance: nonNull(
          arg({
            type: 'String',
            description: 'The starting balance of the cash account',
            default: '0',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { accountName, displayPicture, startingBalance } = args;
        const { userId: id, prisma } = context;

        if (!id) throw new Error('Invalid token');

        const searchUser = await prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw new Error('User does not exist');
        }

        /*
        Avoid same cash account name duplication
        */
        const searchCashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ accountName }, { userId: id }] },
        });

        if (searchCashAccount)
          throw new Error('The same account has already been created');

        const response = await prisma.cashAccount.create({
          data: {
            userId: searchUser.id,
            accountName,
            displayPicture: displayPicture ?? null,
            balance: startingBalance,
            createdAt: new Date(),
          },
        });

        return {
          id: response.id,
          user: {
            id: searchUser.id,
            username: searchUser.username,
            firstName: searchUser.firstName,
            lastName: searchUser.lastName,
            email: searchUser.email,
            whatsapp: searchUser.whatsapp,
            kudosNo: searchUser.kudosNo,
          },
          accountName: response.accountName,
          userId: response.userId,
          balance: response.balance,
          displayPicture: response.displayPicture,
          createdAt: cleanDate(response.createdAt) as string,
        };
      },
    });

    t.nonNull.field('addCashTransaction', {
      type: 'CashAccount',
      description: 'Create a new cash account.',
      args: {
        accountName: nonNull(
          arg({
            type: 'String',
            description:
              'The account name of the cash account that user created. Default to "Cash"',
            default: 'Cash',
          })
        ),
        displayPicture: arg({
          type: 'String',
          description: 'The icon or display picture of that account',
        }),
        startingBalance: nonNull(
          arg({
            type: 'String',
            description: 'The starting balance of the cash account',
            default: '0',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { accountName, displayPicture, startingBalance } = args;
        const { userId: id, prisma } = context;

        if (!id) throw new Error('Invalid token');

        const searchUser = await prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw new Error('User does not exist');
        }

        /*
        Avoid same cash account name duplication
        */
        const searchCashAccount = await prisma.cashAccount.findFirst({
          where: { AND: [{ accountName }, { userId: id }] },
        });

        if (searchCashAccount)
          throw new Error('The same account has already been created');

        const response = await prisma.cashAccount.create({
          data: {
            userId: searchUser.id,
            accountName,
            displayPicture: displayPicture ?? null,
            balance: startingBalance,
            createdAt: new Date(),
          },
        });

        return {
          id: response.id,
          user: {
            id: searchUser.id,
            username: searchUser.username,
            firstName: searchUser.firstName,
            lastName: searchUser.lastName,
            email: searchUser.email,
            whatsapp: searchUser.whatsapp,
            kudosNo: searchUser.kudosNo,
          },
          accountName: response.accountName,
          userId: response.userId,
          balance: response.balance,
          displayPicture: response.displayPicture ?? null,
          createdAt: toTimeStamp(response.createdAt),
        };
      },
    });
  },
});
