import crypto from 'node:crypto';
import { Response } from 'express';
import { env } from './env';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes, matches JWT TTL

export function setAuthCookies(res: Response, accessToken: string) {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });

  // Readable by the client on purpose: double-submit CSRF pattern.
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('csrfToken', { path: '/' });
}
