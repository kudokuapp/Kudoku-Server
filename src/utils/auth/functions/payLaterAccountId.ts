import { PAYLATER_ACCOUNT_SECRET } from './constant';
import * as jwt from 'jsonwebtoken';

export interface IPayLaterAccountSecret {
  payLaterAccountId: string;
}

export function decodePayLaterAccountId(token: string) {
  const { payLaterAccountId } = jwt.verify(
    token,
    PAYLATER_ACCOUNT_SECRET
  ) as IPayLaterAccountSecret;
  return payLaterAccountId;
}

export function encodePayLaterAccountId(payLaterAccountId: string) {
  return jwt.sign({ payLaterAccountId }, PAYLATER_ACCOUNT_SECRET);
}
