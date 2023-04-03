import { EMONEY_ACCOUNT_SECRET } from './constant';
import * as jwt from 'jsonwebtoken';

export interface IEMoneyAccountSecret {
  eMoneyAccountId: string;
}

export function decodeEMoneyAccountId(token: string) {
  const { eMoneyAccountId } = jwt.verify(
    token,
    EMONEY_ACCOUNT_SECRET
  ) as IEMoneyAccountSecret;
  return eMoneyAccountId;
}

export function encodeEMoneyAccountId(eMoneyAccountId: string) {
  return jwt.sign({ eMoneyAccountId }, EMONEY_ACCOUNT_SECRET);
}
