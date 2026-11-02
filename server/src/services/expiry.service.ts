import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';
import { getIO } from '../sockets/io';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function sweepExpiredListings() {
  const expired = await prisma.listing.findMany({
    where: { status: 'ACTIVE', showDateTime: { lt: new Date() } },
  });

  for (const listing of expired) {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: 'EXPIRED' } });
    const notification = await notificationService.create(prisma, {
      userId: listing.sellerId,
      type: 'LISTING_EXPIRED',
      title: 'Listing expired',
      message: `Your listing for ${listing.movieTitle} has expired`,
      relatedListingId: listing.id,
    });
    getIO()?.to(`user:${listing.sellerId}`).emit('notification:new', notification);
  }
}

export function startExpirySweep() {
  sweepExpiredListings().catch((err) => console.error('Expiry sweep failed', err));
  return setInterval(() => {
    sweepExpiredListings().catch((err) => console.error('Expiry sweep failed', err));
  }, SWEEP_INTERVAL_MS);
}
