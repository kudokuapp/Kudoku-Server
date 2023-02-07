import { arg, extendType, nonNull } from 'nexus';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload, OTP_SECRET } from '../../../utils/auth';
import { toTimeStamp } from '../../../utils/date';

export const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('updateUserFirstAndLastName', {
      type: 'User',
      description:
        "Change user's info (email, whatsapp, etc.) but not the user public profile",
      args: {
        firstName: arg({
          type: 'String',
          description:
            'Fill this with the updated firstName, otherwise fill this with "null"',
        }),
        lastName: arg({
          type: 'String',
          description:
            'Fill this with the updated lastName, otherwise fill this with "null"',
        }),
      },

      async resolve(parent, args, context) {
        const { firstName, lastName } = args;
        const { userId: id, prisma } = context;

        if (!lastName && !firstName) {
          throw new Error('Cannot have both firstName and lastName null');
        }

        if (!id) {
          throw new Error('Invalid token');
        }

        if (firstName !== null && firstName !== undefined) {
          await context.prisma.user.update({
            where: { id },
            data: { firstName },
          });
        }
        if (lastName !== null && lastName !== undefined) {
          await context.prisma.user.update({
            where: { id },
            data: { lastName },
          });
        }

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('somehow cannot find user');

        const response = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: firstName ?? user.firstName,
            lastName: lastName ?? user.lastName,
          },
        });

        return {
          id: response.id,
          username: response.username,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          whatsapp: response.whatsapp,
          kudosNo: response.kudosNo,
          createdAt: toTimeStamp(response.createdAt),
        };
      },
    });

    t.nonNull.field('updateEmailOrWhatsapp', {
      type: 'User',
      description: "Change user's email or whatsapp",
      args: {
        email: arg({
          type: 'String',
          description:
            'Fill this with the updated email, otherwise fill this with "null"',
        }),
        whatsapp: arg({
          type: 'String',
          description:
            'Fill this with the updated whatsapp, otherwise fill this with "null"',
        }),
        jwtToken: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with jwtToken after running otpVerify',
          })
        ),
      },

      async resolve(parent, args, context) {
        const { email, whatsapp, jwtToken } = args;
        const { userId: id, prisma } = context;

        if (!email && !whatsapp) {
          throw new Error('Cannot have both firstName and lastName null');
        }

        const { userId: otpId } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (otpId !== id || !id) throw new Error('Invalid token');

        const user = await prisma.user.findFirst({ where: { id } });

        if (!user) throw new Error('Cannot find user');

        const response = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: email ?? user.email,
            whatsapp: whatsapp ?? user.whatsapp,
          },
        });

        if (!response) throw new Error('somehow cannot update user data');

        return {
          id: response.id,
          username: response.username,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          whatsapp: response.whatsapp,
          kudosNo: response.kudosNo,
          createdAt: toTimeStamp(response.createdAt),
        };
      },
    });
  },
});
