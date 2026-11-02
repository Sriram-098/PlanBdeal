import jwt from 'jsonwebtoken';
import { env } from './env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

const ACCESS_TOKEN_TTL = '15m';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
}
