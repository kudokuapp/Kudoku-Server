import { extendType, idArg, nonNull, stringArg } from 'nexus';
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
        const { prisma } = context;
        const { userId } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (id !== userId)
        throw ({status: 1200, message: 'Ada ketidakcocokan antara token dan userId.'})

        const password = await bcrypt.hash(args.password, 10);

        const pin = await bcrypt.hash(args.pin, 10);

        const searchUser = await prisma.user.findFirst({
          where: { id },
        });

        if (!searchUser) {
          throw ({status: 1001, message: 'User belum diundang untuk masuk aplikasi Kudoku.'})
        }

        const user = await prisma.user.update({
          where: { id: searchUser.id },
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
        const { prisma } = context;

        const { userId: id } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (!id) {
          throw ({status: 1100, message: 'Token tidak valid.'})
        }

        const password = await bcrypt.hash(args.password, 10);

        const user = await prisma.user.update({
          where: { id },
          data: { password },
        });

        if (!user) {
          throw ({status: 1000, message: 'User tidak ditemukan.'})
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
        const { prisma } = context;

        const { userId: id } = jwt.verify(
          jwtToken,
          OTP_SECRET
        ) as unknown as AuthTokenPayload;

        if (!id) {
          throw ({status: 1100, message: 'Token tidak valid.'})
        }

        const pin = await bcrypt.hash(args.pin, 10);
        
        const searchUser = await prisma.user.findFirst({where: {id}})
        
        if (!searchUser) {
          throw ({status: 1000, message: 'User tidak ditemukan.'})
        }

        const user = await prisma.user.update({
          where: { id: searchUser.id },
          data: { pin },
        });

        

        const token = jwt.sign({ userId: user.id }, APP_SECRET);

        return { token };
      },
    });
  },
});
