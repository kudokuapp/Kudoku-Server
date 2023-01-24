import { PrismaClient } from '@prisma/client';
import { decodeAuthHeader } from '../src/utils/auth';
import { Request } from 'express';
import twilio from 'twilio';

export const prisma = new PrismaClient();

export const twilioClient = twilio(
  process.env.TWILIO_ACCCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface Context {
  prisma: PrismaClient;
  userId?: string;
  twilioClient: twilio.Twilio;
}

export const context = ({ req }: { req: Request }): Context => {
  const token =
    req && req.headers.authorization
      ? decodeAuthHeader(req.headers.authorization)
      : null;
  return { prisma, userId: token?.userId, twilioClient };
};
