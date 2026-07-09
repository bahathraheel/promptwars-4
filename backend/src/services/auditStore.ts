/**
 * StadiumPulse AI – In-Memory Audit Log & Action Store
 *
 * Stores all situation reports, proposed actions, and operator decisions
 * in memory (sufficient for a demo; production would use a database).
 * Every write is timestamped. Full audit trail is immutable once written.
 */

import { v4 as uuid } from 'uuid';
import type {
  SituationReport,
  ProposedAction,
  AuditEntry,
  ActionDecision,
} from '../types/index.js';

// ─── State ────────────────────────────────────────────────────────────────

const _reports: Map<string, SituationReport> = new Map();
const _actions: Map<string, ProposedAction> = new Map();
const _auditLog: AuditEntry[] = [];

// ─── Situation Reports ────────────────────────────────────────────────────

export function storeSituationReport(report: SituationReport): void {
  _reports.set(report.reportId, report);
  _auditLog.push({
    id: uuid(),
    timestamp: new Date().toISOString(),
    type: 'situation_report',
    metadata: { reportId: report.reportId, summary: report.summary.slice(0, 200) },
  });

  // Also store each proposed action
  for (const action of report.proposedActions) {
    _actions.set(action.id, action);
    _auditLog.push({
      id: uuid(),
      timestamp: new Date().toISOString(),
      type: 'action_proposed',
      actionId: action.id,
      actionTitle: action.title,
      confidence: action.confidence,
      metadata: { category: action.category, priority: action.priority },
    });
  }
}

export function getLatestReport(): SituationReport | undefined {
  const reports = Array.from(_reports.values());
  return reports[reports.length - 1];
}

export function getAllReports(): SituationReport[] {
  return Array.from(_reports.values()).reverse(); // most recent first
}

// ─── Actions ─────────────────────────────────────────────────────────────

export function applyActionDecision(
  decision: ActionDecision,
): ProposedAction | null {
  const action = _actions.get(decision.actionId);
  if (!action) return null;

  const updated: ProposedAction = {
    ...action,
    status: decision.decision,
    decidedAt: new Date().toISOString(),
    decidedBy: decision.operatorId,
  };
  _actions.set(action.id, updated);

  _auditLog.push({
    id: uuid(),
    timestamp: new Date().toISOString(),
    type: decision.decision === 'approved' ? 'action_approved' : 'action_rejected',
    actionId: action.id,
    actionTitle: action.title,
    decision: decision.decision,
    operatorId: decision.operatorId,
    notes: decision.notes,
    confidence: action.confidence,
    metadata: { category: action.category },
  });

  return updated;
}

export function getPendingActions(): ProposedAction[] {
  return Array.from(_actions.values()).filter((a) => a.status === 'pending');
}

export function getAllActions(): ProposedAction[] {
  return Array.from(_actions.values()).reverse();
}

// ─── Audit Log ────────────────────────────────────────────────────────────

export function getAuditLog(limit = 100): AuditEntry[] {
  return _auditLog.slice(-limit).reverse();
}

/** Clear store (for testing only) */
export function clearStore(): void {
  _reports.clear();
  _actions.clear();
  _auditLog.length = 0;
}
