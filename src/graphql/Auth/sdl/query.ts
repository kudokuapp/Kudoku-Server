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
        const user = await context.prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          throw new Error('No such user found');
        }

        const valid = await bcrypt.compare(
          args.password,
          user.password as string
        );

        if (!valid) {
          throw new Error('Invalid password');
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

        if (!user) throw new Error('Cannot find user');

        const valid = await bcrypt.compare(args.pin, user.pin as string);

        if (!valid) throw new Error('Wrong PIN');

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
          try {
            const response = await twilioClient.verify.v2
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verificationChecks.create({ to: email, code: otp });

            if (!response.valid) throw new Error('Wrong OTP');

            const user = await prisma.user.findFirst({ where: { email } });

            if (!user) throw new Error('Cannot find user with the given email');

            const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
              expiresIn: '15m',
            });

            return { token };
          } catch (e: any) {
            throw new Error(e);
          }
        } else if (whatsapp !== null && whatsapp !== undefined) {
          try {
            const response = await twilioClient.verify.v2
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verificationChecks.create({ to: whatsapp, code: otp });
            if (!response.valid) throw new Error('Wrong OTP');

            const user = await prisma.user.findFirst({ where: { whatsapp } });

            if (!user)
              throw new Error('Cannot find user with the given whatsapp');

            const token = jwt.sign({ userId: user.id }, OTP_SECRET, {
              expiresIn: '15m',
            });

            return { token };
          } catch (e: any) {
            throw new Error(e);
          }
        } else {
          throw new Error(
            'Cannot have both whatsapp and email null or undefined'
          );
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

      async resolve(parent, args, context) {
        const { email, whatsapp } = args;

        const { twilioClient } = context;

        if (email !== null && email !== undefined) {
          try {
            const response = await twilioClient.verify
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verifications.create({
                to: email,
                channel: 'email',
                locale: 'id',
              });
            return { response: JSON.stringify(response) };
          } catch (e: any) {
            throw new Error(e);
          }
        } else if (whatsapp !== null && whatsapp !== undefined) {
          try {
            const response = await twilioClient.verify
              .services(process.env.TWILIO_SERVICE_SID as string)
              .verifications.create({
                to: whatsapp,
                channel: 'sms',
                locale: 'id',
              });

            return { response: JSON.stringify(response) };
          } catch (e: any) {
            throw new Error(e);
          }
        } else {
          throw new Error(
            'Cannot have both whatsapp and email null or undefined'
          );
        }
      },
    });
  },
});
