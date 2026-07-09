/**
 * Tests: Audit store – action lifecycle
 */

import {
  storeSituationReport,
  applyActionDecision,
  getPendingActions,
  getAuditLog,
  clearStore,
} from '../services/auditStore';
import type { SituationReport, CrowdSnapshot } from '../types/index';

const mockSnapshot: CrowdSnapshot = {
  snapshotId: 'test-snap-1',
  timestamp: new Date().toISOString(),
  readings: [],
  overallOccupancyPct: 72,
};

const mockReport: SituationReport = {
  reportId: 'test-report-1',
  timestamp: new Date().toISOString(),
  summary: 'Test situation report',
  crowdSnapshot: mockSnapshot,
  llmModelUsed: 'test-model',
  proposedActions: [
    {
      id: 'action-1',
      category: 'open_gate',
      title: 'Open Gate 3B',
      description: 'Open auxiliary gate 3B to relieve pressure.',
      confidence: 0.85,
      rationale: 'Gate 3 is at 90% capacity.',
      affectedGates: ['gate-3', 'gate-3b'],
      priority: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('Audit store', () => {
  beforeEach(() => clearStore());

  test('stores situation report and its actions', () => {
    storeSituationReport(mockReport);
    expect(getPendingActions()).toHaveLength(1);
    expect(getPendingActions()[0]?.id).toBe('action-1');
  });

  test('approve action changes status and creates audit entry', () => {
    storeSituationReport(mockReport);
    const updated = applyActionDecision({
      actionId: 'action-1',
      decision: 'approved',
      operatorId: 'op-123',
    });

    expect(updated?.status).toBe('approved');
    expect(updated?.decidedBy).toBe('op-123');
    expect(getPendingActions()).toHaveLength(0);
  });

  test('reject action changes status to rejected', () => {
    storeSituationReport(mockReport);
    const updated = applyActionDecision({
      actionId: 'action-1',
      decision: 'rejected',
      operatorId: 'op-123',
      notes: 'Not needed right now',
    });
    expect(updated?.status).toBe('rejected');
  });

  test('audit log records all events', () => {
    storeSituationReport(mockReport);
    applyActionDecision({ actionId: 'action-1', decision: 'approved', operatorId: 'op-1' });
    const log = getAuditLog();
    expect(log.some((e) => e.type === 'situation_report')).toBe(true);
    expect(log.some((e) => e.type === 'action_proposed')).toBe(true);
    expect(log.some((e) => e.type === 'action_approved')).toBe(true);
  });

  test('returns null for unknown action id', () => {
    const result = applyActionDecision({ actionId: 'nonexistent', decision: 'approved', operatorId: 'op-1' });
    expect(result).toBeNull();
  });
});
