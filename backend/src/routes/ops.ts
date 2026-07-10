/**
 * StadiumPulse AI – Ops Dashboard Routes
 *
 * GET  /api/ops/snapshot  – generate + return latest crowd snapshot
 * GET  /api/ops/report    – get latest situation report
 * POST /api/ops/report    – generate new situation report from fresh snapshot
 * GET  /api/ops/actions   – list all actions (pending + decided)
 * POST /api/ops/actions/:id/decide – approve or reject an action
 * GET  /api/ops/audit     – full audit log
 */

import { Router, type Request, type Response } from 'express';
import { generateCrowdSnapshot } from '../services/sensorSimulator.js';
import { generateSituationReport } from '../services/opsAgent.js';
import { findShortestPath } from '../services/dijkstra.js';
import {
  getLatestReport,
  getAllReports,
  getAllActions,
  getPendingActions,
  applyActionDecision,
  getAuditLog,
} from '../services/auditStore.js';
import { ActionDecisionSchema } from '../types/index.js';

const router = Router();

// GET /api/ops/snapshot
router.get('/snapshot', (_req: Request, res: Response): void => {
  const snapshot = generateCrowdSnapshot();
  res.json({ snapshot });
});

// GET /api/ops/report
router.get('/report', (_req: Request, res: Response): void => {
  const report = getLatestReport();
  if (!report) {
    res.status(404).json({ error: 'No situation report yet. POST /api/ops/report to generate one.' });
    return;
  }
  res.json({ report });
});

// GET /api/ops/reports (all reports, most recent first)
router.get('/reports', (_req: Request, res: Response): void => {
  res.json({ reports: getAllReports() });
});

// POST /api/ops/report – generate fresh report
router.post('/report', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = generateCrowdSnapshot();
    const report = await generateSituationReport(snapshot);
    res.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[OpsReport] Error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/ops/actions
router.get('/actions', (_req: Request, res: Response): void => {
  const pending = getPendingActions();
  const all = getAllActions();
  res.json({ pending, all });
});

// POST /api/ops/actions/:id/decide
router.post('/actions/:id/decide', (req: Request, res: Response): void => {
  const parseResult = ActionDecisionSchema.safeParse({
    ...req.body,
    actionId: req.params['id'],
  });
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid decision', details: parseResult.error.flatten() });
    return;
  }

  const updated = applyActionDecision(parseResult.data);
  if (!updated) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }

  res.json({ action: updated });
});

// GET /api/ops/audit
router.get('/audit', (req: Request, res: Response): void => {
  const limit = Math.min(parseInt((req.query['limit'] as string) ?? '100', 10), 500);
  res.json({ log: getAuditLog(limit), total: getAuditLog(500).length });
});

// GET /api/ops/route
router.get('/route', (req: Request, res: Response): void => {
  const from = (req.query['from'] as string) ?? 'gate-1';
  const to = (req.query['to'] as string) ?? 'sec-100';
  const result = findShortestPath(from, to);
  res.json(result);
});

export default router;
