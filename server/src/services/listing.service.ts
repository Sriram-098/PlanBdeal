import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateListingInput, ListingQueryInput, UpdateListingInput } from '../validators/listing.validators';
import { closeOutPendingRequests } from './request.service';
import { getIO } from '../sockets/io';

function emitToUser(userId: string, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

function toDecimalInput(value: number) {
  return new Prisma.Decimal(value);
}

export const listingService = {
  async create(sellerId: string, input: CreateListingInput) {
    if (input.askingPricePerTicket > input.originalPricePerTicket * 1.1) {
      // Simple platform policy guard: asking price shouldn't meaningfully exceed what was paid.
      throw ApiError.badRequest('Asking price cannot exceed the original price by more than 10%');
    }
    return prisma.listing.create({
      data: {
        sellerId,
        movieTitle: input.movieTitle,
        posterUrl: input.posterUrl || null,
        language: input.language,
        theatreName: input.theatreName,
        city: input.city,
        theatreLocation: input.theatreLocation || null,
        showDateTime: input.showDateTime,
        showtimeLabel: input.showtimeLabel,
        totalQuantity: input.totalQuantity,
        availableQuantity: input.totalQuantity,
        originalPricePerTicket: toDecimalInput(input.originalPricePerTicket),
        askingPricePerTicket: toDecimalInput(input.askingPricePerTicket),
        provider: input.provider,
        transferEligibility: input.transferEligibility,
        transferMethod: input.transferMethod,
        seatInfo: input.seatInfo || null,
        description: input.description || null,
        status: input.transferEligibility ? 'ACTIVE' : 'CANCELLED',
      },
    });
  },

  async explore(query: ListingQueryInput) {
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      showDateTime: { gt: new Date() },
    };
    if (query.movieTitle) where.movieTitle = { contains: query.movieTitle, mode: 'insensitive' };
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.theatreName) where.theatreName = { contains: query.theatreName, mode: 'insensitive' };
    if (query.language) where.language = { equals: query.language, mode: 'insensitive' };
    if (query.maxPrice !== undefined) where.askingPricePerTicket = { lte: query.maxPrice };
    if (query.minQuantity !== undefined) where.availableQuantity = { gte: query.minQuantity };
    if (query.showDate) {
      const start = new Date(query.showDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.showDateTime = { gte: start, lt: end };
    }

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      query.sort === 'price_asc' ? { askingPricePerTicket: 'asc' } : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { seller: { select: { id: true, fullName: true } } },
      }),
      prisma.listing.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  async getById(id: string) {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { id: true, fullName: true, createdAt: true } } },
    });
    if (!listing) {
      throw ApiError.notFound('Listing not found');
    }
    return listing;
  },

  async getMine(sellerId: string) {
    return prisma.listing.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(id: string, sellerId: string, input: UpdateListingInput) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.sellerId !== sellerId) throw ApiError.forbidden('You do not own this listing');
    if (listing.status !== 'ACTIVE') throw ApiError.conflict('Only active listings can be edited');

    // Quantity can never be edited here — it's only ever changed by the concurrency-safe accept flow.
    const originalPrice = input.originalPricePerTicket ?? Number(listing.originalPricePerTicket);
    const askingPrice = input.askingPricePerTicket ?? Number(listing.askingPricePerTicket);
    if (askingPrice > originalPrice * 1.1) {
      throw ApiError.badRequest('Asking price cannot exceed the original price by more than 10%');
    }
    const transferEligibility = input.transferEligibility ?? listing.transferEligibility;

    return prisma.listing.update({
      where: { id },
      data: {
        ...(input.movieTitle !== undefined && { movieTitle: input.movieTitle }),
        ...(input.posterUrl !== undefined && { posterUrl: input.posterUrl || null }),
        ...(input.language !== undefined && { language: input.language }),
        ...(input.theatreName !== undefined && { theatreName: input.theatreName }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.theatreLocation !== undefined && { theatreLocation: input.theatreLocation || null }),
        ...(input.showDateTime !== undefined && { showDateTime: input.showDateTime }),
        ...(input.showtimeLabel !== undefined && { showtimeLabel: input.showtimeLabel }),
        ...(input.originalPricePerTicket !== undefined && { originalPricePerTicket: toDecimalInput(originalPrice) }),
        ...(input.askingPricePerTicket !== undefined && { askingPricePerTicket: toDecimalInput(askingPrice) }),
        ...(input.provider !== undefined && { provider: input.provider }),
        ...(input.transferEligibility !== undefined && { transferEligibility: input.transferEligibility }),
        ...(input.transferMethod !== undefined && { transferMethod: input.transferMethod }),
        ...(input.seatInfo !== undefined && { seatInfo: input.seatInfo || null }),
        ...(input.description !== undefined && { description: input.description || null }),
        status: transferEligibility ? 'ACTIVE' : 'CANCELLED',
      },
    });
  },

  async cancel(id: string, sellerId: string) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) throw ApiError.notFound('Listing not found');
    if (listing.sellerId !== sellerId) throw ApiError.forbidden('You do not own this listing');
    if (listing.status === 'SOLD') throw ApiError.conflict('A sold listing cannot be cancelled');
    return prisma.listing.update({ where: { id }, data: { status: 'CANCELLED' } });
  },

  async markSold(id: string, sellerId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id } });
      if (!listing) throw ApiError.notFound('Listing not found');
      if (listing.sellerId !== sellerId) throw ApiError.forbidden('You do not own this listing');

      const updatedListing = await tx.listing.update({ where: { id }, data: { status: 'SOLD' } });
      const notifications = await closeOutPendingRequests(
        tx,
        id,
        `The ticket for ${listing.movieTitle} is no longer available — the seller marked it as sold.`,
      );

      return { listing: updatedListing, notifications };
    });

    for (const { userId, notification } of result.notifications) {
      emitToUser(userId, 'notification:new', notification);
    }

    return result.listing;
  },
};
