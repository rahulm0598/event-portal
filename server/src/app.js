import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { razorpayWebhook } from './controllers/payment.controller.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Demo/dev: reflect the request origin so localhost AND the LAN IP both work
  // (phones hit the laptop IP). Lock this to env.clientUrl in production.
  app.use(cors({ origin: env.nodeEnv === 'production' ? env.clientUrl : true, credentials: true }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  // Razorpay webhook needs the raw body for signature verification.
  // Mount it BEFORE express.json so the body stays raw.
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      req.rawBody = req.body;
      next();
    },
    razorpayWebhook
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // serve uploaded photos
  app.use('/uploads', express.static(path.resolve(env.uploadDir)));

  // rate limit auth endpoints (OTP abuse protection)
  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
  );

  app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', ts: Date.now() }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
