import { Server } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { chatService } from '../services/chat.service';
import { notificationService } from '../services/notification.service';
import { prisma } from '../lib/prisma';
import { sendMessageSchema } from '../validators/chat.validators';

export function registerChatHandlers(io: Server, socket: AuthenticatedSocket) {
  socket.on('chat:join', async (threadId: string, ack?: (err?: string) => void) => {
    try {
      await chatService.assertParticipant(threadId, socket.userId!);
      socket.join(`chat:${threadId}`);
      ack?.();
    } catch (err) {
      ack?.((err as Error).message);
    }
  });

  socket.on('message:send', async (payload: { threadId: string; content: string }, ack?: (err?: string) => void) => {
    try {
      const { content } = sendMessageSchema.parse({ content: payload.content });
      const message = await chatService.createMessage(payload.threadId, socket.userId!, content);
      io.to(`chat:${payload.threadId}`).emit('message:new', message);

      const thread = await prisma.chatThread.findUnique({ where: { id: payload.threadId } });
      if (thread) {
        const recipientId = thread.buyerId === socket.userId ? thread.sellerId : thread.buyerId;
        const notification = await notificationService.create(prisma, {
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: content.slice(0, 120),
          relatedChatThreadId: payload.threadId,
        });
        io.to(`user:${recipientId}`).emit('notification:new', notification);
      }
      ack?.();
    } catch (err) {
      ack?.((err as Error).message);
    }
  });
}
