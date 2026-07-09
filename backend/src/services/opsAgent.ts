/**
 * StadiumPulse AI – Ops Agent
 *
 * Reads a CrowdSnapshot and uses the LLM (reasoning tier) to:
 *  1. Generate a natural-language situation report.
 *  2. Produce a ranked list of proposed actions (HITL — never autonomous).
 *
 * All outputs are stored in the audit log before being returned to the UI.
 * No action is "executed" without an explicit human Approve click.
 */

import { v4 as uuid } from 'uuid';
import { llmCall } from './llmClient.js';
import { storeSituationReport } from './auditStore.js';
import type { CrowdSnapshot, SituationReport, ProposedAction } from '../types/index.js';
import { ProposedActionSchema } from '../types/index.js';

// ─── Situation Report ─────────────────────────────────────────────────────

export async function generateSituationReport(
  snapshot: CrowdSnapshot,
): Promise<SituationReport> {
  const system = `You are the Ops Intelligence Agent for a FIFA World Cup stadium.
You receive live aggregate crowd sensor data (NO personal data, NO camera feeds, aggregate counts only).
Your job is to:
1. Write a concise situation report (3–5 sentences) describing current crowd conditions.
2. Propose 2–4 ranked operational actions, each with a confidence score (0–1) and a one-line rationale.
Always be factual and grounded in the numbers provided. Never invent data.
Output ONLY valid JSON matching the schema: { "summary": string, "actions": ProposedAction[] }
where ProposedAction has: { category, title, description, confidence, rationale, affectedGates[], priority }`;

  const snapshotText = snapshot.readings
    .map(
      (r) =>
        `${r.gateId}: ${r.capacityPct}% capacity, ${r.flowRatePerMin} ppl/min flow, ` +
        `wait ~${r.waitTimeMinutes}min, alert=${r.alertLevel}`,
    )
    .join('\n');

  const user = `Stadium snapshot at ${snapshot.timestamp}:
Overall occupancy: ${snapshot.overallOccupancyPct}%

Per-gate readings:
${snapshotText}

Generate situation report and ranked action recommendations.`;

  const result = await llmCall({ system, user, tier: 'reasoning' });

  // Parse LLM JSON output — strip markdown code fences if present
  let parsed: { summary: string; actions: unknown[] };
  try {
    const jsonText = result.text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    parsed = JSON.parse(jsonText) as { summary: string; actions: unknown[] };
  } catch {
    // Fallback: synthesize a basic report if JSON parsing fails
    parsed = {
      summary: result.text.slice(0, 500),
      actions: [],
    };
  }

  const proposedActions: ProposedAction[] = (parsed.actions ?? [])
    .map((raw, idx) => {
      const action = raw as Record<string, unknown>;
      const parsed = ProposedActionSchema.safeParse({
        id: uuid(),
        category: action['category'] ?? 'other',
        title: action['title'] ?? `Action ${idx + 1}`,
        description: action['description'] ?? '',
        confidence: typeof action['confidence'] === 'number' ? action['confidence'] : 0.7,
        rationale: action['rationale'] ?? '',
        affectedGates: Array.isArray(action['affectedGates']) ? action['affectedGates'] : [],
        priority: typeof action['priority'] === 'number' ? action['priority'] : idx + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((a): a is ProposedAction => a !== null)
    .sort((a, b) => a.priority - b.priority);

  const report: SituationReport = {
    reportId: uuid(),
    timestamp: snapshot.timestamp,
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Situation report generated.',
    crowdSnapshot: snapshot,
    proposedActions,
    llmModelUsed: result.modelUsed,
  };

  storeSituationReport(report);
  return report;
}
