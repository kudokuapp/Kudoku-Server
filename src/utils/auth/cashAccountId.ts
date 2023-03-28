import * as jwt from 'jsonwebtoken';
import { CASH_ACCOUNT_SECRET } from './constant';

export interface ICashAccountSecret {
  cashAccountId: string;
}

export function decodeCashAccountId(token: string) {
  const { cashAccountId } = jwt.verify(
    token,
    CASH_ACCOUNT_SECRET
  ) as ICashAccountSecret;
  return cashAccountId;
}

export function encodeCashAccountId(cashAccountId: string) {
  return jwt.sign({ cashAccountId }, CASH_ACCOUNT_SECRET);
}
