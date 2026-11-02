import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

function extractCookieValue(setCookieHeader: string | string[] | undefined, name: string): string | undefined {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const cookie = headers.find((c) => c.startsWith(`${name}=`));
  return cookie?.split(';')[0].split('=')[1];
}

export async function registerUser(overrides?: Partial<{ fullName: string; email: string; password: string }>) {
  const agent = request.agent(app);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const email = overrides?.email ?? `test_${unique}@planbdeal.test`;
  const password = overrides?.password ?? 'Password123!';
  const fullName = overrides?.fullName ?? 'Test User';

  const res = await agent
    .post('/api/v1/auth/register')
    .send({ fullName, email, password, confirmPassword: password });

  const csrfToken = extractCookieValue(res.headers['set-cookie'], 'csrfToken');
  return { agent, csrfToken: csrfToken!, user: res.body.user, email, password };
}

export function authedPost(agent: ReturnType<typeof request.agent>, csrfToken: string, url: string) {
  return agent.post(url).set('X-CSRF-Token', csrfToken);
}

export function authedPatch(agent: ReturnType<typeof request.agent>, csrfToken: string, url: string) {
  return agent.patch(url).set('X-CSRF-Token', csrfToken);
}

const futureDate = (daysFromNow = 5) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(19, 0, 0, 0);
  return d.toISOString();
};

export function validListingPayload(overrides?: Record<string, unknown>) {
  return {
    movieTitle: 'Test Movie',
    language: 'English',
    theatreName: 'Test Theatre',
    city: 'TestCity',
    showDateTime: futureDate(),
    showtimeLabel: '7:00 PM',
    totalQuantity: 2,
    originalPricePerTicket: 300,
    askingPricePerTicket: 280,
    provider: 'BookMyShow',
    transferEligibility: true,
    transferMethod: 'PROVIDER_APP_TRANSFER',
    ...overrides,
  };
}

export async function cleanupTestData() {
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@planbdeal.test' } } } });
  await prisma.message.deleteMany({ where: { sender: { email: { contains: '@planbdeal.test' } } } });
  await prisma.chatThread.deleteMany({ where: { buyer: { email: { contains: '@planbdeal.test' } } } });
  await prisma.connectRequest.deleteMany({ where: { buyer: { email: { contains: '@planbdeal.test' } } } });
  await prisma.listing.deleteMany({ where: { seller: { email: { contains: '@planbdeal.test' } } } });
  await prisma.user.deleteMany({ where: { email: { contains: '@planbdeal.test' } } });
}
