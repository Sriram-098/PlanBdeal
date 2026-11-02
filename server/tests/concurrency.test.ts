import { app, registerUser, authedPost, validListingPayload, cleanupTestData } from './helpers';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Concurrency safety', () => {
  it('allows exactly one of two simultaneous accepts to succeed on a single-ticket listing', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ totalQuantity: 1 }),
    );
    const listingId = createRes.body.listing.id;

    const buyerA = await registerUser();
    const buyerB = await registerUser();

    const reqA = await authedPost(buyerA.agent, buyerA.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    const reqB = await authedPost(buyerB.agent, buyerB.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    expect(reqA.status).toBe(201);
    expect(reqB.status).toBe(201);

    // Fire both accepts at the same time to race for the single remaining ticket.
    const [acceptA, acceptB] = await Promise.all([
      authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${reqA.body.request.id}/accept`),
      authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${reqB.body.request.id}/accept`),
    ]);

    const statuses = [acceptA.status, acceptB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(listing.availableQuantity).toBe(0);
    expect(listing.status).toBe('SOLD');
  });
});
