/**
 * @file tournament.ts
 * @description Tournament reference data router.
 * Exposes venues, fixtures, config options, tournament overview, and the OpenAPI spec.
 * All reference data is ETag-cached at startup for efficiency.
 */

import { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { VENUES, VENUE_MAP } from '../data/venues.js';
import { FIXTURES, TOURNAMENT, CONFIG_OPTIONS } from '../data/fixtures.js';

const router = Router();

// ── ETag caching — serialise reference data once at startup ───────────────
function makeETag(data: unknown): string {
  return `"${createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 16)}"`;
}

/** Serve reference data with ETag / 304 caching */
function cachedJson(data: unknown) {
  const etag = makeETag(data);
  return (req: Request, res: Response): void => {
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.set({
      ETag: etag,
      'Cache-Control': 'public, max-age=3600',
    }).json(data);
  };
}

// Pre-cache all reference payloads at startup
const venueListPayload = { venues: VENUES, count: VENUES.length };
const matchListPayload = { matches: FIXTURES, count: FIXTURES.length };
const tournamentPayload = TOURNAMENT;
const configPayload = CONFIG_OPTIONS;

/**
 * @route GET /api/tournament
 * @description FIFA World Cup 2026 tournament overview.
 */
router.get('/tournament', cachedJson(tournamentPayload));

/**
 * @route GET /api/venues
 * @description All 16 host venues with accessibility and amenity metadata.
 */
router.get('/venues', cachedJson(venueListPayload));

/**
 * @route GET /api/venues/:id
 * @description Single venue detail by ID.
 */
router.get('/venues/:id', (req: Request, res: Response): void => {
  const venue = VENUE_MAP.get(req.params.id);
  if (!venue) {
    res.status(404).json({ error: 'Venue not found', code: 'VENUE_NOT_FOUND', venueId: req.params.id });
    return;
  }
  res.json(venue);
});

/**
 * @route GET /api/matches
 * @description Full 104-match fixture schedule.
 */
router.get('/matches', cachedJson(matchListPayload));

/**
 * @route GET /api/config/options
 * @description UI configuration enumerations: languages (10, RTL-aware), roles, severity, transport.
 */
router.get('/config/options', cachedJson(configPayload));

/**
 * @route GET /api/openapi.json
 * @description OpenAPI 3.1 contract served at runtime.
 */
router.get('/openapi.json', (_req: Request, res: Response): void => {
  try {
    // Resolve from project root (works in both Jest/CommonJS and compiled ESM)
    const specPath = resolve(process.cwd(), 'openapi.json');
    const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as unknown;
    res.set('Content-Type', 'application/json').json(spec);
  } catch {
    res.status(500).json({ error: 'OpenAPI spec unavailable', code: 'SPEC_UNAVAILABLE' });
  }
});

export default router;
