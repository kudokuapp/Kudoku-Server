import { arg, nonNull, stringArg, queryType } from 'nexus';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { APP_SECRET, OTP_SECRET } from '../../../utils/auth/constant';

export const AuthQuery = queryType({
  definition(t) {
    t.nonNull.field('login', {
      type: 'AuthPayLoad',
      args: {
        username: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },

      async resolve(__, { username, password: passwordArg }, { prisma }, ___) {
        try {
          const user = await prisma.user.findFirstOrThrow({
            where: { username },
          });

          const valid = await bcrypt.compare(
            passwordArg,
            user.password as string
          );

          if (!valid) throw new Error('Password salah.');

          const token = jwt.sign({ userId: user.id }, APP_SECRET);

          return { token };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('verifyPin', {
      type: 'AuthPayLoad',
      description: "Get JWT Token from user's PIN.",
      args: {
        username: nonNull(stringArg()),
        pin: nonNull(stringArg()),
      },

      async resolve(__, { username, pin: pinArg }, { prisma }, ___) {
        try {
          const user = await prisma.user.findFirstOrThrow({
            where: { username },
          });

          const valid = await bcrypt.compare(pinArg, user.pin as string);

          if (!valid) throw new Error('PIN salah.');

          const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
            expiresIn: '15m',
          });

          return { token };
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('verifyOtp', {
      type: 'AuthPayLoad',
      description:
        'Get JWT Token from email/whatsapp OTP that has been requested from the client. We then verified the OTP in this server. WhatsApp needs to have "+62" prefix.',
      args: {
        email: arg({
          type: 'String',
          description:
            'Fill this with user email if you want to verify the OTP via the EMAIL OTP, otherwise fill this with "null"',
        }),
        whatsapp: arg({
          type: 'String',
          description:
            'Fill this with user phone number if you want to verify the OTP via the SMS OTP, otherwise fill this with "null"',
        }),
        otp: nonNull(stringArg()), // String since OTP can start with the number 0
      },

      async resolve(
        __,
        { email, whatsapp, otp },
        { twilioClient, prisma },
        ___
      ) {
        try {
          if (email !== null && email !== undefined) {
            const response = await twilioClient.verify.v2
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verificationChecks.create({ to: email, code: otp });

            if (!response.valid) throw new Error('OTP salah.');

            const user = await prisma.user.findFirstOrThrow({
              where: { email },
            });

            const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
              expiresIn: '15m',
            });

            return { token };
          } else if (whatsapp !== null && whatsapp !== undefined) {
            const response = await twilioClient.verify.v2
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verificationChecks.create({ to: whatsapp, code: otp });

            if (!response.valid) throw new Error('OTP salah.');

            const user = await prisma.user.findFirstOrThrow({
              where: { whatsapp },
            });

            const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
              expiresIn: '15m',
            });

            return { token };
          } else {
            throw new Error(
              'WhatsApp dan Email tidak boleh kosong dua-duanya.'
            );
          }
        } catch (error) {
          throw error;
        }
      },
    });

    t.field('getOtp', {
      type: 'ResponseMessage',
      description:
        'Get OTP to user email/whatsapp. WhatsApp needs to have "+62" prefix.',
      args: {
        email: arg({
          type: 'String',
          description:
            'Fill this with user email if you want to verify the OTP via the EMAIL OTP, otherwise fill this with "null"',
        }),
        whatsapp: arg({
          type: 'String',
          description:
            'Fill this with user phone number if you want to verify the OTP via the SMS OTP, otherwise fill this with "null"',
        }),
      },

      async resolve(__, { email, whatsapp }, { twilioClient }, ___) {
        try {
          if (email !== null && email !== undefined) {
            const response = await twilioClient.verify
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verifications.create({
                to: email,
                channel: 'email',
                locale: 'id',
              });
            return { response: JSON.stringify(response) };
          } else if (whatsapp !== null && whatsapp !== undefined) {
            const response = await twilioClient.verify
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verifications.create({
                to: whatsapp,
                channel: 'sms',
                locale: 'id',
              });

            return { response: JSON.stringify(response) };
          } else {
            throw new Error(
              'WhatsApp dan Email tidak boleh kosong dua-duanya.'
            );
          }
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
