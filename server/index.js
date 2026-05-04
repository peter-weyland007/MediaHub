import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const port = Number(process.env.PORT || '8080');
const host = process.env.HOST || '0.0.0.0';

const app = createApp({
  dbPath: process.env.DATABASE_PATH || path.join(projectRoot, 'data', 'mediahub.db'),
  distPath: path.join(projectRoot, 'dist'),
  runtimeConfig: {
    VITE_BASE44_APP_ID: process.env.VITE_BASE44_APP_ID || '',
    VITE_BASE44_APP_BASE_URL: process.env.VITE_BASE44_APP_BASE_URL || '',
    VITE_BASE44_FUNCTIONS_VERSION: process.env.VITE_BASE44_FUNCTIONS_VERSION || '',
  },
});

const server = app.listen(port, host, () => {
  console.log(`MediaHub listening on http://${host}:${port}`);
});

const shutdown = () => {
  server.close(() => {
    app.locals.configStore?.close?.();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
