import { app, registerUser, authedPost, validListingPayload, cleanupTestData } from './helpers';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Connect requests', () => {
  it('prevents a seller from requesting their own listing', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(validListingPayload());
    const listingId = createRes.body.listing.id;

    const res = await authedPost(seller.agent, seller.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects a request for more tickets than are available', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ totalQuantity: 1 }),
    );
    const listingId = createRes.body.listing.id;

    const buyer = await registerUser();
    const res = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 2 });
    expect(res.status).toBe(409);
  });

  it('rejects a request on an expired listing', async () => {
    const seller = await registerUser();
    const expiredListing = await prisma.listing.create({
      data: {
        ...validListingPayload(),
        sellerId: seller.user.id,
        showDateTime: new Date(Date.now() - 86_400_000),
        availableQuantity: 2,
        originalPricePerTicket: 300,
        askingPricePerTicket: 280,
      } as never,
    });

    const buyer = await registerUser();
    const res = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${expiredListing.id}/requests`).send({
      quantity: 1,
    });
    expect(res.status).toBe(409);
  });

  it('prevents a non-owner from accepting a request', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(validListingPayload());
    const listingId = createRes.body.listing.id;

    const buyer = await registerUser();
    const reqRes = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    const requestId = reqRes.body.request.id;

    const stranger = await registerUser();
    const acceptRes = await authedPost(stranger.agent, stranger.csrfToken, `/api/v1/requests/${requestId}/accept`);
    expect(acceptRes.status).toBe(403);
  });

  it('accepting a request creates a chat thread and decrements availability', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ totalQuantity: 2 }),
    );
    const listingId = createRes.body.listing.id;

    const buyer = await registerUser();
    const reqRes = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    const requestId = reqRes.body.request.id;

    const acceptRes = await authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${requestId}/accept`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.request.status).toBe('ACCEPTED');
    expect(acceptRes.body.chatThread.buyerId).toBe(buyer.user.id);

    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(listing.availableQuantity).toBe(1);
  });

  it('queues later requests behind the first one and redacts their buyer identity until their turn', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(
      validListingPayload({ totalQuantity: 1 }),
    );
    const listingId = createRes.body.listing.id;

    const buyer1 = await registerUser();
    const buyer2 = await registerUser();
    const req1 = await authedPost(buyer1.agent, buyer1.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });
    const req2 = await authedPost(buyer2.agent, buyer2.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });

    const receivedRes = await seller.agent.get('/api/v1/users/me/received-requests');
    const seen1 = receivedRes.body.requests.find((r: { id: string }) => r.id === req1.body.request.id);
    const seen2 = receivedRes.body.requests.find((r: { id: string }) => r.id === req2.body.request.id);
    expect(seen1.isActive).toBe(true);
    expect(seen1.buyer).not.toBeNull();
    expect(seen2.isActive).toBe(false);
    expect(seen2.buyer).toBeNull();
    expect(seen2.message).toBeNull();

    // The seller can't skip the queue and act on the second (still-redacted) request directly.
    const skipAheadRes = await authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${req2.body.request.id}/accept`);
    expect(skipAheadRes.status).toBe(409);

    // Rejecting the first request in line promotes the second one to active.
    const rejectRes = await authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${req1.body.request.id}/reject`);
    expect(rejectRes.status).toBe(200);

    const receivedAfterRes = await seller.agent.get('/api/v1/users/me/received-requests');
    const seen2After = receivedAfterRes.body.requests.find((r: { id: string }) => r.id === req2.body.request.id);
    expect(seen2After.isActive).toBe(true);
    expect(seen2After.buyer).not.toBeNull();
  });
});
