import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateRequestInput } from '../validators/request.validators';
import { notificationService } from './notification.service';
import { getIO } from '../sockets/io';

function emitToUser(userId: string, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

// Only the single oldest PENDING request per listing is "active" (visible with buyer identity
// and actionable). Later requests queue silently behind it so the seller can't shop multiple
// buyers for the same ticket at once; identity/message are redacted until it's their turn.
type QueueableRequest = { id: string; listingId: string; status: string; createdAt: Date; buyer?: unknown; message: string | null };

function annotateQueue<T extends QueueableRequest>(requests: T[]) {
  const oldestPendingIdByListing = new Map<string, string>();
  const pendingByListing = new Map<string, T[]>();

  for (const req of requests) {
    if (req.status !== 'PENDING') continue;
    const list = pendingByListing.get(req.listingId) ?? [];
    list.push(req);
    pendingByListing.set(req.listingId, list);
  }
  for (const [listingId, pending] of pendingByListing) {
    const oldest = [...pending].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    oldestPendingIdByListing.set(listingId, oldest.id);
  }

  return requests.map((req) => {
    if (req.status !== 'PENDING') {
      return { ...req, isActive: true as const };
    }
    const isActive = oldestPendingIdByListing.get(req.listingId) === req.id;
    if (isActive) {
      return { ...req, isActive: true as const };
    }
    const pending = [...(pendingByListing.get(req.listingId) ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const queuePosition = pending.findIndex((r) => r.id === req.id) + 1;
    return { ...req, isActive: false as const, queuePosition, buyer: null, message: null };
  });
}

async function assertIsActiveRequest(tx: Prisma.TransactionClient, listingId: string, requestId: string) {
  const oldestPending = await tx.connectRequest.findFirst({
    where: { listingId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!oldestPending || oldestPending.id !== requestId) {
    throw ApiError.conflict('Another buyer is ahead of this request in the queue for this ticket');
  }
}

// Shared by "accept sells out the listing" and "seller manually marks sold" — rejects every
// other still-pending request for a listing and notifies each of those buyers why.
export async function closeOutPendingRequests(
  tx: Prisma.TransactionClient,
  listingId: string,
  message: string,
  excludeRequestId?: string,
) {
  const stillWaiting = await tx.connectRequest.findMany({
    where: { listingId, status: 'PENDING', ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}) },
  });
  const notifications: { userId: string; notification: Awaited<ReturnType<typeof notificationService.create>> }[] = [];
  for (const waiting of stillWaiting) {
    await tx.connectRequest.update({ where: { id: waiting.id }, data: { status: 'REJECTED' } });
    const notification = await notificationService.create(tx, {
      userId: waiting.buyerId,
      type: 'REQUEST_REJECTED',
      title: 'Ticket no longer available',
      message,
      relatedListingId: listingId,
      relatedRequestId: waiting.id,
    });
    notifications.push({ userId: waiting.buyerId, notification });
  }
  return notifications;
}

export const requestService = {
  async create(listingId: string, buyerId: string, input: CreateRequestInput) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.sellerId === buyerId) {
      throw ApiError.badRequest('You cannot request your own listing');
    }
    if (listing.status !== 'ACTIVE' || listing.showDateTime.getTime() <= Date.now()) {
      throw ApiError.conflict('This listing is no longer available');
    }
    if (input.quantity > listing.availableQuantity) {
      throw ApiError.conflict('Requested quantity exceeds what is available');
    }

    const request = await prisma.connectRequest.create({
      data: {
        listingId,
        buyerId,
        quantity: input.quantity,
        message: input.message || null,
      },
    });

    const buyer = await prisma.user.findUniqueOrThrow({ where: { id: buyerId }, select: { fullName: true } });
    const pendingCount = await prisma.connectRequest.count({ where: { listingId, status: 'PENDING' } });
    const isActive = pendingCount === 1; // this request is the oldest pending one, i.e. first in line

    const notification = await notificationService.create(prisma, {
      userId: listing.sellerId,
      type: 'NEW_REQUEST',
      title: isActive ? 'New ticket request' : 'More interest in your ticket',
      message: isActive
        ? `${buyer.fullName} is requesting ${input.quantity} ticket(s) for ${listing.movieTitle}`
        : `${pendingCount - 1} more ${pendingCount - 1 === 1 ? 'person is' : 'people are'} also interested in ${listing.movieTitle}`,
      relatedListingId: listing.id,
      relatedRequestId: request.id,
    });
    emitToUser(listing.sellerId, 'notification:new', notification);

    return request;
  },

  async listSent(buyerId: string) {
    const requests = await prisma.connectRequest.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: { listing: true },
    });
    return annotateQueue(requests);
  },

  async listReceived(sellerId: string) {
    const requests = await prisma.connectRequest.findMany({
      where: { listing: { sellerId } },
      orderBy: { createdAt: 'desc' },
      include: { listing: true, buyer: { select: { id: true, fullName: true } } },
    });
    return annotateQueue(requests);
  },

  // Accept is the concurrency-critical path: an atomic conditional update guarantees
  // inventory can never go negative even if two accepts race on the same listing.
  async accept(requestId: string, sellerId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.connectRequest.findUnique({
        where: { id: requestId },
        include: { listing: true },
      });
      if (!request) throw ApiError.notFound('Request not found');
      if (request.listing.sellerId !== sellerId) throw ApiError.forbidden('You do not own this listing');
      if (request.status !== 'PENDING') throw ApiError.conflict('This request is no longer pending');
      await assertIsActiveRequest(tx, request.listingId, request.id);

      const decremented = await tx.listing.updateMany({
        where: { id: request.listingId, availableQuantity: { gte: request.quantity } },
        data: { availableQuantity: { decrement: request.quantity } },
      });
      if (decremented.count === 0) {
        throw ApiError.conflict('Not enough tickets remain to accept this request');
      }

      const updatedListing = await tx.listing.findUniqueOrThrow({ where: { id: request.listingId } });
      let soldOut = false;
      if (updatedListing.availableQuantity === 0) {
        soldOut = true;
        await tx.listing.update({ where: { id: request.listingId }, data: { status: 'SOLD' } });
      }

      const updatedRequest = await tx.connectRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      const chatThread = await tx.chatThread.create({
        data: {
          listingId: request.listingId,
          requestId: request.id,
          buyerId: request.buyerId,
          sellerId,
        },
      });

      const notification = await notificationService.create(tx, {
        userId: request.buyerId,
        type: 'REQUEST_ACCEPTED',
        title: 'Request accepted',
        message: `Your request for ${request.listing.movieTitle} was accepted. You can now chat with the seller.`,
        relatedListingId: request.listingId,
        relatedRequestId: request.id,
        relatedChatThreadId: chatThread.id,
      });

      // Ticket is gone — anyone still waiting in the queue for this listing gets closed out and told why.
      const otherNotifications = soldOut
        ? await closeOutPendingRequests(
            tx,
            request.listingId,
            `This ticket for ${request.listing.movieTitle} has been sold to another buyer.`,
            request.id,
          )
        : [];

      return { request: updatedRequest, chatThread, notification, otherNotifications };
    });

    emitToUser(result.request.buyerId, 'notification:new', result.notification);
    emitToUser(result.request.buyerId, 'chat:thread-created', result.chatThread);
    emitToUser(sellerId, 'chat:thread-created', result.chatThread);
    for (const { userId, notification } of result.otherNotifications) {
      emitToUser(userId, 'notification:new', notification);
    }

    return result;
  },

  async reject(requestId: string, sellerId: string) {
    const notification = await prisma.$transaction(async (tx) => {
      const request = await tx.connectRequest.findUnique({
        where: { id: requestId },
        include: { listing: true },
      });
      if (!request) throw ApiError.notFound('Request not found');
      if (request.listing.sellerId !== sellerId) throw ApiError.forbidden('You do not own this listing');
      if (request.status !== 'PENDING') throw ApiError.conflict('This request is no longer pending');
      await assertIsActiveRequest(tx, request.listingId, request.id);

      const updated = await tx.connectRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'REJECTED' } });
      if (updated.count === 0) throw ApiError.conflict('This request is no longer pending');

      return notificationService.create(tx, {
        userId: request.buyerId,
        type: 'REQUEST_REJECTED',
        title: 'Request rejected',
        message: `Your request for ${request.listing.movieTitle} was rejected by the seller`,
        relatedListingId: request.listingId,
        relatedRequestId: request.id,
      });
    });

    emitToUser(notification.userId, 'notification:new', notification);
    return prisma.connectRequest.findUniqueOrThrow({ where: { id: requestId } });
  },

  async withdraw(requestId: string, buyerId: string) {
    const request = await prisma.connectRequest.findUnique({ where: { id: requestId } });
    if (!request) throw ApiError.notFound('Request not found');
    if (request.buyerId !== buyerId) throw ApiError.forbidden('This is not your request');
    if (request.status !== 'PENDING') throw ApiError.conflict('This request is no longer pending');

    return prisma.connectRequest.update({ where: { id: requestId }, data: { status: 'WITHDRAWN' } });
  },
};
