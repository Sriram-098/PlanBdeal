import { app, registerUser, authedPost, validListingPayload, cleanupTestData } from './helpers';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Chat access control', () => {
  it('only lets thread participants read messages', async () => {
    const seller = await registerUser();
    const createRes = await authedPost(seller.agent, seller.csrfToken, '/api/v1/listings').send(validListingPayload());
    const listingId = createRes.body.listing.id;

    const buyer = await registerUser();
    const reqRes = await authedPost(buyer.agent, buyer.csrfToken, `/api/v1/listings/${listingId}/requests`).send({ quantity: 1 });

    const acceptRes = await authedPost(seller.agent, seller.csrfToken, `/api/v1/requests/${reqRes.body.request.id}/accept`);
    const threadId = acceptRes.body.chatThread.id;

    const buyerMessagesRes = await buyer.agent.get(`/api/v1/chats/${threadId}/messages`);
    expect(buyerMessagesRes.status).toBe(200);

    const sellerMessagesRes = await seller.agent.get(`/api/v1/chats/${threadId}/messages`);
    expect(sellerMessagesRes.status).toBe(200);

    const stranger = await registerUser();
    const strangerRes = await stranger.agent.get(`/api/v1/chats/${threadId}/messages`);
    expect(strangerRes.status).toBe(403);
  });
});
