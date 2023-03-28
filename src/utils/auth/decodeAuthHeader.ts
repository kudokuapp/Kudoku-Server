import * as jwt from 'jsonwebtoken';
import { APP_SECRET } from './constant';

export interface AuthTokenPayload {
  userId: string;
}

export default function decodeAuthHeader(authHeader: String): AuthTokenPayload {
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token found');
  }

  return jwt.verify(token, APP_SECRET) as AuthTokenPayload;
}
