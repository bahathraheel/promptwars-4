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
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import chatRouter from './routes/chat.js';
import opsRouter from './routes/ops.js';
import whatifRouter from './routes/whatif.js';
import sustainabilityRouter from './routes/sustainability.js';
import matchRouter from './routes/match.js';
import concessionsRouter from './routes/concessions.js';
import volunteerRouter from './routes/volunteer.js';
import capabilitiesRouter from './routes/capabilities.js';
import compatibilityRouter from './routes/compatibility.js';
import { initializeKnowledgeBase } from './services/knowledgeBase.js';
import { getDijkstraMetrics } from './services/dijkstra.js';
import { getLlmCacheMetrics } from './services/llmClient.js';

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

// Permissions Policy Header
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
});

// Request-ID Correlation Header Tracer
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  }),
);

// ─── 2-Tier Rate limiting ──────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60000,
  max: 100, // General limit: 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.', code: 'RATE_LIMIT_EXCEEDED' },
});

const strictLimiter = rateLimit({
  windowMs: 60000,
  max: 15, // Sensitive limit: 15 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Strict rate limit exceeded. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' },
});

// Tier 1: General limiter on all API endpoints
app.use('/api/', generalLimiter);

// Tier 2: Strict limiters on sensitive endpoints
app.use('/api/chat', strictLimiter);
app.use('/api/match/commentary', strictLimiter);
app.use('/api/concessions/order', strictLimiter);
app.use('/api/volunteer/incident', strictLimiter);

// ─── Body parsing & Content-Type Guards ───────────────────────────────────
app.use(compression());

// Content-Type 415 Guard
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      res.status(415).json({
        error: 'Unsupported Media Type: Payload must be application/json',
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
      return;
    }
  }
  next();
});

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'StadiumPulse AI Backend', timestamp: new Date().toISOString() });
});

// ─── Metrics Check ────────────────────────────────────────────────────────
app.get('/api/metrics', (_req, res) => {
  const memory = process.memoryUsage();
  res.json({
    uptimeSeconds: process.uptime(),
    memory: {
      rssMb: parseFloat((memory.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: parseFloat((memory.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: parseFloat((memory.heapTotal / 1024 / 1024).toFixed(2)),
    },
    caching: {
      dijkstra: getDijkstraMetrics(),
      llm: getLlmCacheMetrics(),
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/chat', chatRouter);
app.use('/api/ops', opsRouter);
app.use('/api/whatif', whatifRouter);
app.use('/api/sustainability', sustainabilityRouter);
app.use('/api/match', matchRouter);
app.use('/api/concessions', concessionsRouter);
app.use('/api/volunteer', volunteerRouter);
app.use('/api/capabilities', capabilitiesRouter);
app.use('/api', compatibilityRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler (Suppress Production Leakages) ──────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  const isProd = process.env['NODE_ENV'] === 'production';
  res.status(500).json({
    error: isProd ? 'Internal server error' : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(isProd ? {} : { stack: err.stack }),
  });
});

export default app;
