/**
 * @file capabilities.ts
 * @description StadiumPulse AI – Capabilities and tournament grounding metadata route.
 * Exposes the 8 core capabilities, 4 named audiences, and real FIFA World Cup 2026 statistics.
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

const REAL_2026_DATA = {
  venuesCount: 16,
  venues: [
    'MetLife Stadium (New York/New Jersey)',
    'Estadio Azteca (Mexico City)',
    'BC Place (Vancouver)',
    'Lumen Field (Seattle)',
    'Levi\'s Stadium (San Francisco Bay Area)',
    'SoFi Stadium (Los Angeles)',
    'Estadio BBVA (Monterrey)',
    'Estadio Akron (Guadalajara)',
    'Arrowhead Stadium (Kansas City)',
    'AT&T Stadium (Dallas)',
    'NRG Stadium (Houston)',
    'Mercedes-Benz Stadium (Atlanta)',
    'Lincoln Financial Field (Philadelphia)',
    'Gillette Stadium (Boston)',
    'Hard Rock Stadium (Miami)',
    'BMO Field (Toronto)'
  ],
  teamsCount: 48,
  openingVenue: 'Estadio Azteca (Mexico City)',
  finalVenue: 'MetLife Stadium (New York/New Jersey)'
};

const CAPABILITY_AREAS = [
  { id: 'fan_concierge', name: 'Fan Concierge RAG Copilot', description: 'Grounded multilingual assistant resolving stadium FAQs.' },
  { id: 'live_voice', name: 'Live Voice Interaction', description: 'Gemini Live API integration for real-time voice consultations.' },
  { id: 'sustainability_transit', name: 'Sustainability & Transit CO2', description: 'AI waste categorizer and transit carbon offset comparisons.' },
  { id: 'ops_dashboard', name: 'Operations Command Center', description: 'Real-time telemetry reports, snapshots, and manual controls.' },
  { id: 'whatif_simulator', name: 'What-If Crowd Simulator', description: 'Predictive surge simulator mapping density and mitigations.' },
  { id: 'audit_log', name: 'Immutable Audit Logging', description: 'System log recording operator approvals, rejections, and details.' },
  { id: 'match_commentary', name: 'Live Scores & GenAI Commentary', description: 'Live match scoreboard ticking with style-specific commentaries.' },
  { id: 'stadium_navigation', name: 'Step-Free Map Routing', description: 'Memoized Dijkstra solver resolving wheelchair-accessible routing.' }
];

const AUDIENCES = [
  { name: 'Fans', features: ['Fan Copilot Chat', 'Live Voice Assistance', 'Food Concessions Order', 'Accessibility Map Navigation'] },
  { name: 'Operations Command Operators', features: ['Telemetry Snapshot', 'Ops Dashboard Checkpoints', 'What-If Simulation Plans'] },
  { name: 'Ground Volunteers & Stewards', features: ['Safety checklists', 'One-Tap Incident Reporter'] },
  { name: 'Audit Inspectors', features: ['Immutable Audit Logs', 'Operator notes inspections'] }
];

/**
 * @route GET /api/capabilities
 * @description Retrieves tournament statistics, the 8 capabilities, and 4 named audiences.
 * @access Public
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    worldCup2026: REAL_2026_DATA,
    capabilities: CAPABILITY_AREAS,
    audiences: AUDIENCES
  });
});

export default router;
