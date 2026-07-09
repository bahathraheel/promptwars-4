// API client with typed request/response — all backend calls live here

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  language?: string;
  mode: 'chat' | 'sms' | 'pictogram' | 'voice';
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  detectedLanguage: string;
  retrievedChunks: number;
  topRetrievalScore: number;
  isGrounded: boolean;
  intent: string;
  modelUsed: string;
  responseTimeMs: number;
}

export interface SensorReading {
  gateId: string;
  timestamp: string;
  occupancy: number;
  capacityPct: number;
  flowRatePerMin: number;
  waitTimeMinutes: number;
  alertLevel: 'normal' | 'elevated' | 'critical';
}

export interface CrowdSnapshot {
  snapshotId: string;
  timestamp: string;
  readings: SensorReading[];
  overallOccupancyPct: number;
}

export interface ProposedAction {
  id: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  rationale: string;
  affectedGates: string[];
  priority: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface SituationReport {
  reportId: string;
  timestamp: string;
  summary: string;
  crowdSnapshot: CrowdSnapshot;
  proposedActions: ProposedAction[];
  llmModelUsed: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: string;
  actionId?: string;
  actionTitle?: string;
  decision?: string;
  operatorId?: string;
  notes?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface WhatIfResponse {
  narrative: string;
  bottlenecks: string[];
  mitigations: string[];
  chartData: Array<{ label: string; baseline: number; simulated: number }>;
  modelUsed: string;
  responseTimeMs: number;
}

export interface SustainabilityResponse {
  binRecommendation: string;
  binColor: string;
  binLabel: string;
  emissionsComparison?: {
    routeName: string;
    carCO2kg: number;
    shuttleCO2kg: number;
    metroCO2kg: number;
    recommendedMode: string;
    savingsVsCar: number;
  };
  explanation: string;
}

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  chat: (body: ChatRequest) =>
    apiCall<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify(body) }),

  getSnapshot: () =>
    apiCall<{ snapshot: CrowdSnapshot }>('/api/ops/snapshot'),

  getReport: () =>
    apiCall<{ report: SituationReport }>('/api/ops/report'),

  generateReport: () =>
    apiCall<{ report: SituationReport }>('/api/ops/report', { method: 'POST' }),

  getActions: () =>
    apiCall<{ pending: ProposedAction[]; all: ProposedAction[] }>('/api/ops/actions'),

  decideAction: (actionId: string, decision: 'approved' | 'rejected', notes?: string) =>
    apiCall<{ action: ProposedAction }>(`/api/ops/actions/${actionId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, operatorId: 'operator-1', notes }),
    }),

  getAuditLog: (limit = 50) =>
    apiCall<{ log: AuditEntry[]; total: number }>(`/api/ops/audit?limit=${limit}`),

  whatIf: (extraFans: number, gateId: string, minutesBefore: number) =>
    apiCall<WhatIfResponse>('/api/whatif', {
      method: 'POST',
      body: JSON.stringify({ extraFans, gateId, minutesBefore }),
    }),

  sustainability: (item: string, routeId?: string) =>
    apiCall<SustainabilityResponse>('/api/sustainability', {
      method: 'POST',
      body: JSON.stringify({ item, routeId }),
    }),
};
