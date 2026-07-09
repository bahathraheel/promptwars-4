/**
 * StadiumPulse AI – What-If Simulation Route
 *
 * POST /api/whatif
 * Takes a hypothetical fan-surge scenario and returns an LLM narrative
 * with bottleneck analysis and mitigation suggestions, plus chart data.
 */

import { Router, type Request, type Response } from 'express';
import { WhatIfRequestSchema, WhatIfResponseSchema } from '../types/index.js';
import { generateCrowdSnapshot, GATE_CONFIGS, STADIUM_CAPACITY } from '../services/sensorSimulator.js';
import { llmCall } from '../services/llmClient.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const startMs = Date.now();

  const parseResult = WhatIfRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { extraFans, gateId, minutesBefore } = parseResult.data;

  // Get current baseline snapshot
  const baseline = generateCrowdSnapshot();

  // Find target gate config
  const gateConfig = GATE_CONFIGS.find((g) => g.id === gateId);
  const gateName = gateConfig?.name ?? gateId;
  const gateMax = gateConfig?.maxCapacity ?? 10000;

  // Build snapshot text for LLM context
  const baselineText = baseline.readings
    .map((r) => `${r.gateId}: ${r.capacityPct}% capacity, flow=${r.flowRatePerMin}/min`)
    .join('\n');

  // Simulated post-surge values
  const surgeGateReading = baseline.readings.find((r) => r.gateId === gateId);
  const baselineOccupancy = surgeGateReading?.occupancy ?? 5000;
  const surgeOccupancy = Math.min(gateMax, baselineOccupancy + extraFans);
  const surgeCapacityPct = parseFloat(((surgeOccupancy / gateMax) * 100).toFixed(1));

  const system = `You are a crowd safety analyst for a FIFA World Cup stadium.
A stadium operator has provided a what-if scenario. Analyze it using the provided baseline data
and the hypothetical surge, then:
1. Write a 4–6 sentence narrative describing likely bottlenecks and crowd flow impacts.
2. List 2–3 specific bottleneck locations (JSON array of strings).
3. List 2–4 mitigation steps (JSON array of strings).
Be precise and grounded in the numbers. Do not invent stadium features not mentioned.
Output ONLY valid JSON: { "narrative": string, "bottlenecks": string[], "mitigations": string[] }`;

  const user = `CURRENT BASELINE (real-time):
Overall stadium occupancy: ${baseline.overallOccupancyPct}% of ${STADIUM_CAPACITY} capacity
${baselineText}

WHAT-IF SCENARIO:
An additional ${extraFans.toLocaleString()} fans arrive via ${gateName} in the next ${minutesBefore} minutes.
This would push ${gateName} from ${surgeGateReading?.capacityPct ?? 0}% to approximately ${surgeCapacityPct}% capacity.

Analyze the impact and provide recommendations.`;

  try {
    const result = await llmCall({ system, user, tier: 'reasoning' });

    let parsed: { narrative: string; bottlenecks: string[]; mitigations: string[] };
    try {
      const jsonText = result.text
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      parsed = JSON.parse(jsonText) as typeof parsed;
    } catch {
      parsed = {
        narrative: result.text,
        bottlenecks: [`${gateName} main entry`, 'Concourse Level 1 corridor'],
        mitigations: ['Open auxiliary gates', 'Deploy additional stewards', 'PA announcement for alternative routes'],
      };
    }

    // Build chart data for frontend visualization
    const chartData = baseline.readings.map((r) => ({
      label: r.gateId.replace('gate-', 'Gate '),
      baseline: r.capacityPct,
      simulated: r.gateId === gateId
        ? parseFloat(Math.min(100, surgeCapacityPct).toFixed(1))
        : parseFloat(Math.min(100, r.capacityPct * 1.05).toFixed(1)), // spillover effect
    }));

    res.json(
      WhatIfResponseSchema.parse({
        narrative: parsed.narrative,
        bottlenecks: parsed.bottlenecks ?? [],
        mitigations: parsed.mitigations ?? [],
        chartData,
        modelUsed: result.modelUsed,
        responseTimeMs: Date.now() - startMs,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Simulation failed';
    res.status(500).json({ error: message });
  }
});

export default router;
