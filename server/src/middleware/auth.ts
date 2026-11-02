import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) {
    return next(ApiError.unauthorized());
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized('Session expired, please log in again'));
  }
}

// Attaches req.user when a valid cookie is present, but never blocks the request (for guest-accessible routes).
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken as string | undefined;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
    } catch {
      // ignore invalid/expired token for optional-auth routes
    }
  }
  next();
}
