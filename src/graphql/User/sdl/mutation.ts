import { arg, extendType, nonNull } from 'nexus';
import * as jwt from 'jsonwebtoken';
import { OTP_SECRET, AuthTokenPayload } from '../../../utils/auth';

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

      async resolve(__, { firstName, lastName }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          if (!lastName && !firstName)
            throw new Error('Semua value tidak boleh null atau undefined.');

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
            createdAt: response.createdAt,
          };
        } catch (error) {
          throw error;
        }
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

      async resolve(
        __,
        { email, whatsapp, jwtToken },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          if (!email && !whatsapp)
            throw new Error('Semua value tidak boleh null atau undefined.');

          const { userId: otpId } = jwt.verify(
            jwtToken,
            OTP_SECRET
          ) as unknown as AuthTokenPayload;

          if (otpId !== userId) throw new Error('jwtToken tidak valid.');

          const response = await prisma.user.update({
            where: { id: user.id },
            data: {
              email: email ?? user.email,
              whatsapp: whatsapp ?? user.whatsapp,
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
            createdAt: response.createdAt,
          };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
