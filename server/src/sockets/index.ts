import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../lib/env';
import { socketAuthMiddleware, AuthenticatedSocket } from './socketAuth';
import { registerChatHandlers } from './chat.socket';
import { registerCallHandlers } from './call.socket';
import { setIO } from './io';

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.join(`user:${socket.userId}`);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
  });

  setIO(io);
  return io;
}
