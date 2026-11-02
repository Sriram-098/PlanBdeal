import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Connects over the same origin (proxied in dev) so the httpOnly auth cookie is sent automatically.
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { withCredentials: true, autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
