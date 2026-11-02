import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type TxClient = Prisma.TransactionClient | PrismaClient;

export const notificationService = {
  async create(
    client: TxClient,
    data: {
      userId: string;
      type: 'NEW_REQUEST' | 'REQUEST_ACCEPTED' | 'REQUEST_REJECTED' | 'NEW_MESSAGE' | 'LISTING_EXPIRED';
      title: string;
      message: string;
      relatedListingId?: string;
      relatedRequestId?: string;
      relatedChatThreadId?: string;
    },
  ) {
    return client.notification.create({ data });
  },

  async listForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  },

  async unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return null;
    }
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  },
};
