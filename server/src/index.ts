import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './sockets';
import { startExpirySweep } from './services/expiry.service';
import { env } from './lib/env';

const app = createApp();
const httpServer = http.createServer(app);
createSocketServer(httpServer);
startExpirySweep();

httpServer.listen(env.port, () => {
  console.log(`PlanBDeal API listening on http://localhost:${env.port}`);
});
