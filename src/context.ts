import { PrismaClient } from '@prisma/client';
import { decodeAuthHeader } from './utils/auth';
import { Request, Response } from 'express';
import twilio from 'twilio';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const prisma = new PrismaClient();

const twilioClient = twilio(
  process.env.TWILIO_ACCCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
  twilioClient: twilio.Twilio;
  pubsub: PubSub;
}

export const context = ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Context => {
  const token =
    req && req.headers.authorization
      ? decodeAuthHeader(req.headers.authorization)
      : null;

  return { prisma, userId: token ? token.userId : null, twilioClient, pubsub };
};
