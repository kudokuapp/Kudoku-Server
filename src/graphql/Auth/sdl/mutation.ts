import { idArg, mutationType, nonNull, stringArg } from 'nexus';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { APP_SECRET, OTP_SECRET, AuthTokenPayload } from '../../../utils/auth/';

export const AuthMutation = mutationType({
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

      async resolve(
        __,
        { id, username, password: passwordArg, pin: pinArg, jwtToken },
        { prisma },
        ___
      ) {
        try {
          const { userId } = jwt.verify(
            jwtToken,
            OTP_SECRET
          ) as unknown as AuthTokenPayload;

          if (id !== userId)
            throw new Error('Ada ketidakcocokan antara token dan userId.');

          const searchUser = await prisma.user.findFirstOrThrow({
            where: { id },
          });

          const password = await bcrypt.hash(passwordArg, 10);

          const pin = await bcrypt.hash(pinArg, 10);

          const user = await prisma.user.update({
            where: { id: searchUser.id },
            data: { username, password, pin },
          });

          const token = jwt.sign({ userId: user.id }, APP_SECRET);

          return { token };
        } catch (e) {
          throw e;
        }
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

      async resolve(__, { password: passwordArg, jwtToken }, { prisma }, ___) {
        try {
          const { userId: id } = jwt.verify(
            jwtToken,
            OTP_SECRET
          ) as unknown as AuthTokenPayload;

          if (!id) throw new Error('Token tidak valid.');

          const searchUser = await prisma.user.findFirstOrThrow({
            where: { id },
          });

          const password = await bcrypt.hash(passwordArg, 10);

          const user = await prisma.user.update({
            where: { id: searchUser.id },
            data: { password },
          });

          const token = jwt.sign({ userId: user.id }, APP_SECRET);

          return { token };
        } catch (error) {
          throw error;
        }
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

      async resolve(__, { pin: pinArg, jwtToken }, { prisma }, ___) {
        try {
          const { userId: id } = jwt.verify(
            jwtToken,
            OTP_SECRET
          ) as unknown as AuthTokenPayload;

          if (!id) throw new Error('Token tidak valid.');

          const pin = await bcrypt.hash(pinArg, 10);

          const searchUser = await prisma.user.findFirstOrThrow({
            where: { id },
          });

          const user = await prisma.user.update({
            where: { id: searchUser.id },
            data: { pin },
          });

          const token = jwt.sign({ userId: user.id }, APP_SECRET);

          return { token };
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
