/**
 * StadiumPulse AI – Express Application
 *
 * Security middleware stack (applied in order):
 *  1. helmet – secure HTTP headers
 *  2. cors – restrict to configured frontend origin
 *  3. express-rate-limit – abuse prevention on public endpoints
 *  4. compression – gzip response compression
 *  5. JSON body parser with size limit
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import chatRouter from './routes/chat.js';
import opsRouter from './routes/ops.js';
import whatifRouter from './routes/whatif.js';
import sustainabilityRouter from './routes/sustainability.js';
import matchRouter from './routes/match.js';
import concessionsRouter from './routes/concessions.js';
import volunteerRouter from './routes/volunteer.js';
import { initializeKnowledgeBase } from './services/knowledgeBase.js';

// Initialize knowledge base embeddings ONCE at startup
initializeKnowledgeBase();

const app = express();

// ─── Security headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────
const rawOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
const allowedOrigins = [
  rawOrigin,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});
app.use('/api/', limiter);

// ─── Body parsing ─────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'StadiumPulse AI Backend', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/chat', chatRouter);
app.use('/api/ops', opsRouter);
app.use('/api/whatif', whatifRouter);
app.use('/api/sustainability', sustainabilityRouter);
app.use('/api/match', matchRouter);
app.use('/api/concessions', concessionsRouter);
app.use('/api/volunteer', volunteerRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
