import { app, registerUser, cleanupTestData } from './helpers';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Auth', () => {
  it('registers a new user and sets auth cookies', async () => {
    const { user } = await registerUser();
    expect(user.email).toContain('@planbdeal.test');
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('rejects mismatched passwords on register', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Bad User', email: `bad_${Date.now()}@planbdeal.test`, password: 'Password123!', confirmPassword: 'Different123!' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects wrong password with a generic message', async () => {
    const { email, password } = await registerUser();
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);

    const badLoginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1!' });
    expect(badLoginRes.status).toBe(401);
    expect(badLoginRes.body.error.message).toBe('Invalid email or password');
  });

  it('rejects /me without a session cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows /me with a valid session cookie', async () => {
    const { agent } = await registerUser();
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
  });
});
