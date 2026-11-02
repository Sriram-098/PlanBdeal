import { Server as SocketIOServer } from 'socket.io';

// Simple singleton so REST services can emit real-time events without a circular import on app.ts.
let io: SocketIOServer | null = null;

export function setIO(instance: SocketIOServer) {
  io = instance;
}

export function getIO(): SocketIOServer | null {
  return io;
}
