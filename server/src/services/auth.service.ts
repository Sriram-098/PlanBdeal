import argon2 from 'argon2';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { RegisterInput, LoginInput } from '../validators/auth.validators';

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Same generic message style as login to avoid confirming which emails are registered.
      throw ApiError.conflict('Unable to create account with these details');
    }
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { fullName: input.fullName, email: input.email, passwordHash },
    });
    return user;
  },

  async validateCredentials(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    return user;
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  },
};
