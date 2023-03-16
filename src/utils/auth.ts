import * as jwt from 'jsonwebtoken';

export const APP_SECRET = process.env.APP_SECRET as string;

export const OTP_SECRET = process.env.OTP_SECRET as string;

export interface AuthTokenPayload {
  userId: string;
}

export function decodeAuthHeader(authHeader: String): AuthTokenPayload {
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token found');
  }

  return jwt.verify(token, APP_SECRET) as AuthTokenPayload;
}

/**
 * Cash Account
 */
export const CASH_ACCOUNT_SECRET = process.env.CASH_ACCOUNT_SECRET as string;
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

/**
 * Debit Account
 */
export const DEBIT_ACCOUNT_SECRET = process.env.DEBIT_ACCOUNT_SECRET as string;
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

/**
 * EWallet Account
 */
export const EWALLET_ACCOUNT_SECRET = process.env
  .EWALLET_ACCOUNT_SECRET as string;
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

/**
 * EMoney Account
 */
export const EMONEY_ACCOUNT_SECRET = process.env
  .EMONEY_ACCOUNT_SECRET as string;
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

/**
 * PayLater Account
 */
export const PAYLATER_ACCOUNT_SECRET = process.env
  .PAYLATER_ACCOUNT_SECRET as string;
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
