/**
 * StadiumPulse AI – Shared TypeScript types and Zod schemas.
 * All API boundary types are defined here; no `any` at boundaries.
 */

import { z } from 'zod';

// ─── Knowledge Base Types ──────────────────────────────────────────────────

export interface KnowledgeChunk {
  id: string;
  source: string;        // source filename
  category: string;      // gates | transit | policy | faq | medical | food | sustainability
  text: string;          // plain-text content used for embedding
  embedding: number[];   // cosine-similarity vector (computed at startup)
  metadata: Record<string, unknown>;
}

export interface RetrievalResult {
  chunk: KnowledgeChunk;
  score: number;         // cosine similarity 0–1
}

export interface GroundedContext {
  chunks: RetrievalResult[];
  topScore: number;
  isConfident: boolean;  // topScore >= RETRIEVAL_CONFIDENCE_THRESHOLD
}

// ─── Chat / Fan Copilot ───────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatMessageSchema).max(20).default([]),
  language: z.string().max(10).optional(),   // ISO 639-1 code; auto-detected if omitted
  mode: z.enum(['chat', 'sms', 'pictogram', 'voice']).default('chat'),
  sessionId: z.string().max(64).optional(),
});

export const ChatResponseSchema = z.object({
  reply: z.string(),
  detectedLanguage: z.string(),
  retrievedChunks: z.number(),
  topRetrievalScore: z.number(),
  isGrounded: z.boolean(),
  intent: z.string(),          // intent class for routing transparency
  modelUsed: z.string(),       // which model tier was invoked
  responseTimeMs: z.number(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Sensor / Crowd Intelligence ─────────────────────────────────────────

// PRIVACY-BY-DESIGN: Only aggregate counts allowed. No individual identifiers,
// no biometrics, no facial recognition data may appear in this schema.
export interface SensorReading {
  gateId: string;
  timestamp: string;         // ISO-8601
  occupancy: number;         // absolute count (aggregate only)
  capacityPct: number;       // 0–100
  flowRatePerMin: number;    // people entering per minute
  waitTimeMinutes: number;   // estimated queue wait
  alertLevel: 'normal' | 'elevated' | 'critical';
}

export interface CrowdSnapshot {
  snapshotId: string;
  timestamp: string;
  readings: SensorReading[];
  overallOccupancyPct: number;
}

// ─── Ops Copilot / Agent ─────────────────────────────────────────────────

export const ActionCategorySchema = z.enum([
  'open_gate',
  'close_gate',
  'reroute_fans',
  'redeploy_volunteers',
  'adjust_shuttle',
  'medical_alert',
  'pa_announcement',
  'other',
]);

export const ProposedActionSchema = z.object({
  id: z.string(),
  category: ActionCategorySchema,
  title: z.string().max(200),
  description: z.string().max(1000),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(500),
  affectedGates: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(10),  // 1 = highest
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),   // operator ID (simulated)
});

export const SituationReportSchema = z.object({
  reportId: z.string(),
  timestamp: z.string(),
  summary: z.string(),
  crowdSnapshot: z.custom<CrowdSnapshot>(),
  proposedActions: z.array(ProposedActionSchema),
  llmModelUsed: z.string(),
});

export const ActionDecisionSchema = z.object({
  actionId: z.string(),
  decision: z.enum(['approved', 'rejected']),
  operatorId: z.string().max(64).default('operator-1'),
  notes: z.string().max(500).optional(),
});

export type ProposedAction = z.infer<typeof ProposedActionSchema>;
export type SituationReport = z.infer<typeof SituationReportSchema>;
export type ActionDecision = z.infer<typeof ActionDecisionSchema>;
export type ActionCategory = z.infer<typeof ActionCategorySchema>;

// ─── Audit Log ────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: 'action_proposed' | 'action_approved' | 'action_rejected' | 'situation_report';
  actionId?: string;
  actionTitle?: string;
  decision?: 'approved' | 'rejected';
  operatorId?: string;
  notes?: string;
  confidence?: number;
  metadata: Record<string, unknown>;
}

// ─── What-If Simulation ──────────────────────────────────────────────────

export const WhatIfRequestSchema = z.object({
  extraFans: z.number().int().min(1).max(50000),
  gateId: z.string().max(32),
  minutesBefore: z.number().int().min(1).max(180),
});

export const WhatIfResponseSchema = z.object({
  narrative: z.string(),
  bottlenecks: z.array(z.string()),
  mitigations: z.array(z.string()),
  chartData: z.array(z.object({
    label: z.string(),
    baseline: z.number(),
    simulated: z.number(),
  })),
  modelUsed: z.string(),
  responseTimeMs: z.number(),
});

export type WhatIfRequest = z.infer<typeof WhatIfRequestSchema>;
export type WhatIfResponse = z.infer<typeof WhatIfResponseSchema>;

// ─── Sustainability ───────────────────────────────────────────────────────

export const SustainabilityRequestSchema = z.object({
  item: z.string().min(1).max(200),   // e.g. "plastic water bottle"
  routeId: z.string().max(32).optional(),
});

export const SustainabilityResponseSchema = z.object({
  binRecommendation: z.string(),
  binColor: z.string(),
  binLabel: z.string(),
  emissionsComparison: z.object({
    routeName: z.string(),
    carCO2kg: z.number(),
    shuttleCO2kg: z.number(),
    metroCO2kg: z.number(),
    recommendedMode: z.string(),
    savingsVsCar: z.number(),
  }).optional(),
  explanation: z.string(),
});

export type SustainabilityRequest = z.infer<typeof SustainabilityRequestSchema>;
export type SustainabilityResponse = z.infer<typeof SustainabilityResponseSchema>;

// ─── Match Center ─────────────────────────────────────────────────────────

export const MatchCommentaryRequestSchema = z.object({
  style: z.enum(['neutral', 'hype', 'tactical']),
});
export type MatchCommentaryRequest = z.infer<typeof MatchCommentaryRequestSchema>;

// ─── Concessions ──────────────────────────────────────────────────────────

export const FoodOrderItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(10),
  price: z.number().min(0),
});
export const FoodOrderRequestSchema = z.object({
  standId: z.string().min(1).max(32),
  items: z.array(FoodOrderItemSchema).min(1),
  totalPrice: z.number().min(0),
});
export type FoodOrderRequest = z.infer<typeof FoodOrderRequestSchema>;

// ─── Volunteer Hub ────────────────────────────────────────────────────────

export const VolunteerIncidentSchema = z.object({
  category: z.enum(['medical', 'congestion', 'facility', 'security', 'other']),
  gateId: z.string().min(1).max(32),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string().min(5).max(500),
});
export type VolunteerIncident = z.infer<typeof VolunteerIncidentSchema>;
