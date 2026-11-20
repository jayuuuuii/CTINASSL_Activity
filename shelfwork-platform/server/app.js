import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { uploadsDir } from './utils/uploads.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Allowed frontend origins (Vite's default dev address) — override with CORS_ORIGIN.
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins, allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'] }));

  // Small JSON bodies everywhere; the image upload route sets its own larger limit.
  const smallJson = express.json({ limit: '100kb' });
  app.use((req, res, next) => (/\/image$/.test(req.path) ? next() : smallJson(req, res, next)));

  // Product images. nosniff stops browsers from treating an image as something else.
  app.use(
    '/uploads',
    express.static(uploadsDir(), {
      maxAge: '1h',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
