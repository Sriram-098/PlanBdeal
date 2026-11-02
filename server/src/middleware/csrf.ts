import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Login/register happen before a CSRF cookie exists, so they are intentionally exempt.
const EXEMPT_PATHS = new Set(['/api/v1/auth/login', '/api/v1/auth/register']);

// Double-submit cookie CSRF protection: the csrfToken cookie is readable (not httpOnly)
// so the client can mirror its value into the X-CSRF-Token header on mutating requests.
// A cross-site attacker's browser will send the cookie automatically but cannot read its
// value to forge the matching header, since the cookie belongs to this origin only.
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    return next();
  }
  const cookieToken = req.cookies?.csrfToken as string | undefined;
  const headerToken = req.header('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token'));
  }
  next();
}
