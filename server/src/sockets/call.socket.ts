import { Server } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { chatService } from '../services/chat.service';

async function assertCallParticipants(threadId: string, fromUserId: string, toUserId: string) {
  const thread = await chatService.assertParticipant(threadId, fromUserId);
  const otherParticipant = thread.buyerId === fromUserId ? thread.sellerId : thread.buyerId;
  if (otherParticipant !== toUserId) {
    throw new Error('Target user is not part of this conversation');
  }
}

// Voice-only WebRTC signaling relay. The server never sees media, only SDP/ICE metadata,
// and every event is scoped to the two participants of an already-accepted chat thread —
// no phone numbers or other contact details are ever exchanged.
export function registerCallHandlers(io: Server, socket: AuthenticatedSocket) {
  const relay = (event: string) =>
    async (payload: { threadId: string; toUserId: string; [key: string]: unknown }, ack?: (err?: string) => void) => {
      try {
        await assertCallParticipants(payload.threadId, socket.userId!, payload.toUserId);
        io.to(`user:${payload.toUserId}`).emit(event, { ...payload, fromUserId: socket.userId });
        ack?.();
      } catch (err) {
        ack?.((err as Error).message);
      }
    };

  socket.on('call:invite', relay('call:incoming'));
  socket.on('call:accept', relay('call:accepted'));
  socket.on('call:reject', relay('call:rejected'));
  socket.on('call:offer', relay('call:offer'));
  socket.on('call:answer', relay('call:answer'));
  socket.on('call:ice-candidate', relay('call:ice-candidate'));
  socket.on('call:end', relay('call:end'));
}
