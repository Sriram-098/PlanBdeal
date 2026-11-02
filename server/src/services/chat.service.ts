import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export const chatService = {
  async listMyThreads(userId: string) {
    const threads = await prisma.chatThread.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, movieTitle: true, posterUrl: true, city: true, theatreName: true } },
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return threads;
  },

  async getById(threadId: string, userId: string) {
    await this.assertParticipant(threadId, userId);
    return prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        listing: { select: { id: true, movieTitle: true, posterUrl: true, city: true, theatreName: true } },
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
      },
    });
  },

  async assertParticipant(threadId: string, userId: string) {
    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) throw ApiError.notFound('Chat thread not found');
    if (thread.buyerId !== userId && thread.sellerId !== userId) {
      throw ApiError.forbidden('You are not part of this conversation');
    }
    return thread;
  },

  async getMessages(threadId: string, userId: string, page: number, pageSize: number) {
    await this.assertParticipant(threadId, userId);
    const messages = await prisma.message.findMany({
      where: { chatThreadId: threadId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return messages.reverse();
  },

  async createMessage(threadId: string, senderId: string, content: string) {
    await this.assertParticipant(threadId, senderId);
    return prisma.message.create({
      data: { chatThreadId: threadId, senderId, content },
    });
  },
};
