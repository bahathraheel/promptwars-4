/**
 * StadiumPulse AI – Sustainability Route
 *
 * POST /api/sustainability
 * - Identifies correct waste bin for a described item
 * - Returns emissions comparison for a sample route
 */

import { Router, type Request, type Response } from 'express';
import { SustainabilityRequestSchema, SustainabilityResponseSchema } from '../types/index.js';
import { retrieve } from '../services/knowledgeBase.js';
import { llmCall } from '../services/llmClient.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parseResult = SustainabilityRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { item, routeId } = parseResult.data;

  // Retrieve sustainability context
  const ctx = retrieve(`recycling bin waste ${item} compost sustainability`);
  const contextText = ctx.chunks
    .slice(0, 3)
    .map((r) => r.chunk.text)
    .join('\n\n');

  const system = `You are the Sustainability Assistant for MetroArena 2026.
Using only the provided context about bin categories, tell the user which bin to use for their item.
Output ONLY valid JSON: { "binLabel": string, "binColor": string, "explanation": string }
binLabel must be one of: "Recycling", "Compost / Organic", "Landfill / General Waste", "E-Waste"
binColor must be one of: "blue", "green", "black", "yellow"`;

  const user = `Context:\n${contextText}\n\nWhich bin should this go in? Item: "${item}"`;

  try {
    const result = await llmCall({ system, user, tier: 'fast' });

    let binInfo: { binLabel: string; binColor: string; explanation: string };
    try {
      const jsonText = result.text
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      binInfo = JSON.parse(jsonText) as typeof binInfo;
    } catch {
      binInfo = {
        binLabel: 'Landfill / General Waste',
        binColor: 'black',
        explanation: `For "${item}", please use the black Landfill / General Waste bin if unsure.`,
      };
    }

    // Emissions comparison — use requested routeId or default to downtown
    const emissionsCtx = retrieve(`emissions transport route co2 carbon`);
    const routeData = emissionsCtx.chunks.find(
      (r) => r.chunk.metadata['id'] === (routeId ?? 'route-downtown'),
    ) ?? emissionsCtx.chunks.find((r) => r.chunk.metadata['distance_km'] !== undefined);

    let emissionsComparison: SustainabilityResponseSchema | undefined;
    if (routeData?.chunk.metadata) {
      const m = routeData.chunk.metadata as Record<string, unknown>;
      emissionsComparison = {
        routeName: String(m['name'] ?? 'Sample Route'),
        carCO2kg: Number(m['car_co2_kg'] ?? 0),
        shuttleCO2kg: Number(m['shuttle_co2_kg'] ?? 0),
        metroCO2kg: Number(m['metro_co2_kg'] ?? 0),
        recommendedMode: String(m['recommended_mode'] ?? 'metro'),
        savingsVsCar: parseFloat(
          (Number(m['car_co2_kg'] ?? 0) - Number(m['metro_co2_kg'] ?? 0)).toFixed(2),
        ),
      } as unknown as SustainabilityResponseSchema;
    }

    res.json(
      SustainabilityResponseSchema.parse({
        binRecommendation: `Use the ${binInfo.binColor} ${binInfo.binLabel} bin.`,
        binColor: binInfo.binColor,
        binLabel: binInfo.binLabel,
        emissionsComparison: emissionsComparison,
        explanation: binInfo.explanation,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Workaround for TypeScript type extraction
type SustainabilityResponseSchema = {
  routeName: string;
  carCO2kg: number;
  shuttleCO2kg: number;
  metroCO2kg: number;
  recommendedMode: string;
  savingsVsCar: number;
};

export default router;
