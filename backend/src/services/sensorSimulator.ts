/**
 * StadiumPulse AI – Synthetic Sensor Data Generator
 *
 * PRIVACY-BY-DESIGN NOTE: This module generates ONLY aggregate crowd counts.
 * No individual identifiers, biometrics, facial recognition, or PII are
 * generated, stored, or transmitted. Only anonymized capacity percentages
 * and flow rates are produced.
 *
 * The generator simulates a realistic match-day crowd buildup curve
 * (rapid ingress 2h before, peak at kick-off, slow egress after).
 */

import { v4 as uuid } from 'uuid';
import type { SensorReading, CrowdSnapshot } from '../types/index.js';

// ─── Stadium constants ────────────────────────────────────────────────────

const GATE_CONFIGS = [
  { id: 'gate-1', name: 'Gate 1 – North', maxCapacity: 8000,  baseFlowRate: 120 },
  { id: 'gate-2', name: 'Gate 2 – East VIP', maxCapacity: 4000, baseFlowRate: 60 },
  { id: 'gate-3', name: 'Gate 3 – South', maxCapacity: 12000, baseFlowRate: 200 },
  { id: 'gate-4', name: 'Gate 4 – West', maxCapacity: 6000,  baseFlowRate: 100 },
] as const;

const STADIUM_CAPACITY = 80000;

// ─── Match-day simulation state ───────────────────────────────────────────

/** Match start time (simulated as 90 minutes into the simulation) */
let _simulationStartMs: number | null = null;
let _totalOccupancy = 0;

/** Initialize simulation start */
function getSimulationMinutes(): number {
  if (!_simulationStartMs) {
    _simulationStartMs = Date.now();
  }
  return (Date.now() - _simulationStartMs) / 60000;
}

/**
 * Crowd buildup curve: returns a 0–1 multiplier representing
 * ingress intensity as a function of simulated time.
 * Peaks around T+90min (simulated), then slowly declines.
 */
function crowdCurveMultiplier(minutesSinceStart: number): number {
  // Use fast-forward: 1 real minute = 5 simulated match-day minutes
  const matchMinutes = minutesSinceStart * 5;
  if (matchMinutes < 30) return 0.2 + (matchMinutes / 30) * 0.4;   // gates just opened
  if (matchMinutes < 90) return 0.6 + ((matchMinutes - 30) / 60) * 0.4; // peak ingress
  if (matchMinutes < 120) return 1.0;                                 // match is on
  return Math.max(0.2, 1.0 - ((matchMinutes - 120) / 60) * 0.8);   // egress
}

/** Add ±20% gaussian-ish noise to a value */
function withNoise(value: number, noiseRange = 0.2): number {
  const noise = 1 + (Math.random() * 2 - 1) * noiseRange;
  return Math.max(0, value * noise);
}

function deriveAlertLevel(capacityPct: number): 'normal' | 'elevated' | 'critical' {
  if (capacityPct >= 90) return 'critical';
  if (capacityPct >= 75) return 'elevated';
  return 'normal';
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a fresh CrowdSnapshot with synthetic per-gate readings.
 * Called on a timer by the ops pipeline; NOT per-user-request.
 */
export function generateCrowdSnapshot(): CrowdSnapshot {
  const now = new Date().toISOString();
  const curve = crowdCurveMultiplier(getSimulationMinutes());

  const readings: SensorReading[] = GATE_CONFIGS.map((gate) => {
    const flowRate = withNoise(gate.baseFlowRate * curve);
    // Accumulate occupancy (simplified — each snapshot adds incremental count)
    const increment = flowRate * (30 / 60); // 30-second tick, flow is per-minute
    const occupancy = Math.min(
      gate.maxCapacity,
      Math.round(withNoise(gate.maxCapacity * curve * 0.85 + increment)),
    );
    const capacityPct = Math.min(100, (occupancy / gate.maxCapacity) * 100);

    return {
      gateId: gate.id,
      timestamp: now,
      occupancy,
      capacityPct: parseFloat(capacityPct.toFixed(1)),
      flowRatePerMin: parseFloat(flowRate.toFixed(1)),
      waitTimeMinutes: parseFloat(withNoise((capacityPct / 100) * 8, 0.3).toFixed(1)),
      alertLevel: deriveAlertLevel(capacityPct),
    };
  });

  _totalOccupancy = readings.reduce((sum, r) => sum + r.occupancy, 0);
  const overallOccupancyPct = parseFloat(
    ((_totalOccupancy / STADIUM_CAPACITY) * 100).toFixed(1),
  );

  return {
    snapshotId: uuid(),
    timestamp: now,
    readings,
    overallOccupancyPct,
  };
}

/** Reset simulation (for testing) */
export function resetSimulation(): void {
  _simulationStartMs = null;
  _totalOccupancy = 0;
}

export { GATE_CONFIGS, STADIUM_CAPACITY };
