import * as jwt from 'jsonwebtoken';
import { DEBIT_ACCOUNT_SECRET } from './constant';

export interface IDebitAccountSecret {
  debitAccountId: string;
}

export function decodeDebitAccountId(token: string) {
  const { debitAccountId } = jwt.verify(
    token,
    DEBIT_ACCOUNT_SECRET
  ) as IDebitAccountSecret;
  return debitAccountId;
}

export function encodeDebitAccountId(debitAccountId: string) {
  return jwt.sign({ debitAccountId }, DEBIT_ACCOUNT_SECRET);
}
