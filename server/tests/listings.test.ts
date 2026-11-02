import { app, registerUser, authedPost, authedPatch, validListingPayload, cleanupTestData } from './helpers';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Listings', () => {
  it('creates a listing for the authenticated seller', async () => {
    const { agent, csrfToken } = await registerUser();
    const res = await authedPost(agent, csrfToken, '/api/v1/listings').send(validListingPayload());
    expect(res.status).toBe(201);
    expect(res.body.listing.status).toBe('ACTIVE');
    expect(res.body.listing.availableQuantity).toBe(res.body.listing.totalQuantity);
  });

  it('rejects a listing with a show date in the past', async () => {
    const { agent, csrfToken } = await registerUser();
    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    const res = await authedPost(agent, csrfToken, '/api/v1/listings').send(validListingPayload({ showDateTime: pastDate }));
    expect(res.status).toBe(400);
  });

  it('rejects a listing with a negative price', async () => {
    const { agent, csrfToken } = await registerUser();
    const res = await authedPost(agent, csrfToken, '/api/v1/listings').send(
      validListingPayload({ askingPricePerTicket: -10 }),
    );
    expect(res.status).toBe(400);
  });

  it('notifies remaining pending requesters when the seller manually marks a listing sold', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ totalQuantity: 2 }),
    );
    const listingId = createRes.body.listing.id;

    const buyer = await registerUser();
    const reqRes = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    expect(reqRes.status).toBe(201);

    const soldRes = await authedPost(seller.agent, seller.csrfToken, `/api/v1/listings/${listingId}/sold`);
    expect(soldRes.status).toBe(200);
    expect(soldRes.body.listing.status).toBe('SOLD');

    const updatedRequest = await prisma.connectRequest.findUniqueOrThrow({ where: { id: reqRes.body.request.id } });
    expect(updatedRequest.status).toBe('REJECTED');

    const notification = await prisma.notification.findFirst({
      where: { userId: buyer.user.id, relatedRequestId: reqRes.body.request.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification?.message).toContain('no longer available');
  });

  it('prevents a non-owner from cancelling someone else\'s listing', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(validListingPayload());
    const listingId = createRes.body.listing.id;

    const otherUser = await registerUser();
    const cancelRes = await authedPost(otherUser.agent, otherUser.csrfToken, `/api/v1/listings/${listingId}/cancel`);
    expect(cancelRes.status).toBe(403);
  });

  it('lets the owner edit price fields and rejects edits from a non-owner', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ originalPricePerTicket: 300, askingPricePerTicket: 0 }),
    );
    const listingId = createRes.body.listing.id;

    const editRes = await authedPatch(seller.agent, seller.csrfToken, `/api/v1/listings/${listingId}`).send({
      askingPricePerTicket: 250,
    });
    expect(editRes.status).toBe(200);
    expect(Number(editRes.body.listing.askingPricePerTicket)).toBe(250);
    expect(editRes.body.listing.totalQuantity).toBe(createRes.body.listing.totalQuantity);

    const stranger = await registerUser();
    const strangerEditRes = await authedPatch(stranger.agent, stranger.csrfToken, `/api/v1/listings/${listingId}`).send({
      askingPricePerTicket: 1,
    });
    expect(strangerEditRes.status).toBe(403);
  });

  it('filters explore results by city', async () => {
    const { agent, csrfToken } = await registerUser();
    const uniqueCity = `UniqueCity_${Date.now()}`;
    await authedPost(agent, csrfToken, '/api/v1/listings').send(validListingPayload({ city: uniqueCity }));

    const res = await agent.get('/api/v1/listings').query({ city: uniqueCity });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((l: { city: string }) => l.city.toLowerCase() === uniqueCity.toLowerCase())).toBe(true);
  });
});
