import { arg, extendType, idArg, nonNull, stringArg } from 'nexus';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload, OTP_SECRET, APP_SECRET } from '../../../utils/auth';

export const AuthMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('signup', {
      type: 'AuthPayLoad',
      description:
        "This is the API where user can sign up after they got invited. This means that the user's data is already in our MongoDB database.",
      args: {
        id: nonNull(idArg()),
        username: nonNull(stringArg()),
        password: nonNull(stringArg()),
        pin: nonNull(stringArg()),
        jwtToken: nonNull(stringArg()),
      },

      async resolve(parent, args, context) {
        const { username, id, jwtToken } = args;
        const { userId } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (id !== userId)
          throw new Error(
            'ID mismatch between the token and the given id. It seems like the token is wrong.'
          );

        const password = await bcrypt.hash(args.password, 10);

        const pin = await bcrypt.hash(args.pin, 10);

        const searchUser = await context.prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw new Error('User have not registered through kudoku.id');
        }

        const user = await context.prisma.user.update({
          where: { id },
          data: { username, password, pin },
        });

        const token = jwt.sign({ userId: user.id }, APP_SECRET);

        return { token };
      },
    });

    t.nonNull.field('changePassword', {
      type: 'AuthPayLoad',
      description:
        'Change the user password. Must have JWT Token from running OTP Verification',
      args: {
        password: nonNull(stringArg()),
        jwtToken: nonNull(stringArg()),
      },

      async resolve(parent, args, context) {
        const { jwtToken } = args;

        const { userId: id } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (!id) {
          throw new Error('Invalid token');
        }

        const password = await bcrypt.hash(args.password, 10);

        const user = await context.prisma.user.update({
          where: { id },
          data: { password },
        });

        if (!user) {
          throw new Error('Cannot find user!');
        }

        const token = jwt.sign({ userId: user.id }, APP_SECRET);

        return { token };
      },
    });

    t.nonNull.field('changePin', {
      type: 'AuthPayLoad',
      description:
        'Change the user pin. Must have JWT Token from running OTP Verification',
      args: {
        pin: nonNull(stringArg()),
        jwtToken: nonNull(stringArg()),
      },

      async resolve(parent, args, context) {
        const { jwtToken } = args;

        const { userId: id } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (!id) {
          throw new Error('Invalid token');
        }

        const pin = await bcrypt.hash(args.pin, 10);

        const user = await context.prisma.user.update({
          where: { id },
          data: { pin },
        });

        if (!user) {
          throw new Error('Cannot find user!');
        }

        const token = jwt.sign({ userId: user.id }, APP_SECRET);

        return { token };
      },
    });
  },
});
