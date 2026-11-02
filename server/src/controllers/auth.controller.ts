import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { authService } from '../services/auth.service';
import { signAccessToken } from '../lib/jwt';
import { setAuthCookies, clearAuthCookies } from '../lib/cookies';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { ApiError } from '../utils/ApiError';

function toPublicUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookies(res, accessToken);
    res.status(201).json({ user: toPublicUser(user) });
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const user = await authService.validateCredentials(input);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    setAuthCookies(res, accessToken);
    res.status(200).json({ user: toPublicUser(user) });
  },

  async logout(_req: Request, res: Response) {
    clearAuthCookies(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const user = await authService.getById(req.user.id);
    res.status(200).json({ user: toPublicUser(user) });
  },
};
