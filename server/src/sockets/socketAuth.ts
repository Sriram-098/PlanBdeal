import cookie from 'cookie';
import { Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Socket.IO handshake auth: reuses the same httpOnly accessToken cookie as REST requests.
export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error('Authentication required'));
    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;
    if (!token) return next(new Error('Authentication required'));
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
}
