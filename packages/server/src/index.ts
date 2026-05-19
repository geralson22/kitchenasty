import { createServer } from 'http';
import { mkdirSync } from 'fs';
import path from 'path';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';
import { serverLogger } from './lib/logger.js';

const PORT = process.env.PORT || 3000;

const uploadsDir = path.resolve(process.cwd(), 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const app = createApp();
const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  serverLogger.info(`KitchenAsty server running on http://localhost:${PORT}`);
});
