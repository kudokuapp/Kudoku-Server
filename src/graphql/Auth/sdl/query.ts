import { extendType, arg, nonNull, stringArg } from 'nexus';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { APP_SECRET, OTP_SECRET } from '../../../utils/auth';

export const AuthQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('login', {
      type: 'AuthPayLoad',
      args: {
        username: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },

      async resolve(parent, args, context) {
        const { username } = args;
        const { prisma } = context;

        const user = await prisma.user.findFirst({
          where: { username },
        });

        if (!user) {
          throw { status: 1000, message: 'User tidak ditemukan.' };
        }

        const valid = await bcrypt.compare(
          args.password,
          user.password as string
        );

        if (!valid) {
          throw { status: 1300, message: 'Password salah.' };
        }
        const token = jwt.sign({ userId: user.id }, APP_SECRET);
        return { token };
      },
    });

    t.nonNull.field('verifyPin', {
      type: 'AuthPayLoad',
      description: "Get JWT Token from user's PIN.",
      args: {
        username: nonNull(stringArg()),
        pin: nonNull(stringArg()),
      },

      async resolve(parent, args, context) {
        const { username } = args;

        const { prisma } = context;

        const user = await prisma.user.findFirst({ where: { username } });

        if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

        const valid = await bcrypt.compare(args.pin, user.pin as string);

        if (!valid) throw { status: 1400, message: 'PIN salah.' };

        const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
          expiresIn: '15m',
        });

        return { token };
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

      async resolve(parent, args, context) {
        const { email, whatsapp, otp } = args;

        const { twilioClient, prisma } = context;

        if (email !== null && email !== undefined) {
          const response = await twilioClient.verify.v2
            .services(process.env.TWILIO_SERVICE_SID as string)
            .verificationChecks.create({ to: email, code: otp })
            .catch((e) => {
              throw { status: Number(`7${e.status}`), message: e.message };
            });

          if (!response.valid) throw { status: 1500, message: 'OTP salah.' };

          const user = await prisma.user.findFirst({ where: { email } });

          if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

          const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
            expiresIn: '15m',
          });

          return { token };
        } else if (whatsapp !== null && whatsapp !== undefined) {
          const response = await twilioClient.verify.v2
            .services(process.env.TWILIO_SERVICE_SID as string)
            .verificationChecks.create({ to: whatsapp, code: otp })
            .catch((e: Error) => {
              throw { status: Number(`7000`), message: e.message };
            });

          if (!response.valid) throw { status: 1500, message: 'OTP salah.' };

          const user = await prisma.user.findFirst({ where: { whatsapp } });

          if (!user) throw { status: 1000, message: 'User tidak ditemukan.' };

          const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
            expiresIn: '15m',
          });

          return { token };
        } else {
          throw {
            status: 2002,
            message: 'WhatsApp dan Email tidak boleh kosong dua-duanya.',
          };
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

      async resolve(parent, args, context, info) {
        const { email, whatsapp } = args;

        const { twilioClient } = context;

        if (email !== null && email !== undefined) {
          const response = await twilioClient.verify
            .services(process.env.TWILIO_SERVICE_SID as string)
            .verifications.create({
              to: email,
              channel: 'email',
              locale: 'id',
            })
            .catch((e: Error) => {
              throw { status: Number(`7000`), message: e.message };
            });

          return { response: JSON.stringify(response) };
        } else if (whatsapp !== null && whatsapp !== undefined) {
          const response = await twilioClient.verify
            .services(process.env.TWILIO_SERVICE_SID as string)
            .verifications.create({
              to: whatsapp,
              channel: 'sms',
              locale: 'id',
            })
            .catch((e: Error) => {
              throw { status: Number(`7000`), message: e.message };
            });

          return { response: JSON.stringify(response) };
        } else {
          throw {
            status: 2002,
            message: 'WhatsApp dan Email tidak boleh kosong dua-duanya.',
          };
        }
      },
    });
  },
});
