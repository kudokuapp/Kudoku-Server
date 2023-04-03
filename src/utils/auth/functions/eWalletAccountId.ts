import { EWALLET_ACCOUNT_SECRET } from './constant';
import * as jwt from 'jsonwebtoken';

export interface IEWalletAccountSecret {
  eWalletAccountId: string;
}

export function decodeEWalletAccountId(token: string) {
  const { eWalletAccountId } = jwt.verify(
    token,
    EWALLET_ACCOUNT_SECRET
  ) as IEWalletAccountSecret;
  return eWalletAccountId;
}

export function encodeEWalletAccountId(eWalletAccountId: string) {
  return jwt.sign({ eWalletAccountId }, EWALLET_ACCOUNT_SECRET);
}
