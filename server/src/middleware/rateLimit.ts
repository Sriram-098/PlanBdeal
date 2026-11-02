import rateLimit from 'express-rate-limit';

// Jest spins up many real users per test file; a tight auth rate limit would otherwise
// make the test suite flaky/order-dependent, so limiting is skipped only under Jest.
const isTestEnv = Boolean(process.env.JEST_WORKER_ID);

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: { error: { message: 'Too many attempts, please try again later' } },
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: { error: { message: 'Too many requests, please slow down' } },
});
