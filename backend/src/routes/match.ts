/**
 * @file match.ts
 * @description StadiumPulse AI – Match telemetry & GenAI commentary generator route.
 * Exposes endpoints to retrieve real-time scores and broadcast style-tailored soccer commentary.
 */

import { Router, type Request, type Response } from 'express';
import { MatchCommentaryRequestSchema } from '../types/index.js';
import { llmCall } from '../services/llmClient.js';

const router = Router();

let scoreBlue = 0;
let scoreGold = 0;
let clockMinutes = 0;
let clockSeconds = 0;
let commentary: string[] = ['The teams are still in the tunnel.'];

/**
 * Background simulation loop.
 * Speeds up elapsed match clock and triggers goal events based on random telemetry.
 */
let matchInterval = setInterval(() => {
  clockSeconds += 15;
  if (clockSeconds >= 60) {
    clockMinutes += 1;
    clockSeconds = 0;
  }

  if (clockMinutes >= 90) {
    clearInterval(matchInterval);
    commentary.unshift(`[90'] 🏁 Full Time! Blue ${scoreBlue} - Gold ${scoreGold}`);
    return;
  }

  if (Math.random() < 0.03 && clockMinutes > 0) {
    const isBlue = Math.random() < 0.5;
    if (isBlue) {
      scoreBlue += 1;
      commentary.unshift(`[${clockMinutes}'] ⚽ GOAL for Blue! Strikers slot it home. Score: Blue ${scoreBlue} - Gold ${scoreGold}`);
    } else {
      scoreGold += 1;
      commentary.unshift(`[${clockMinutes}'] ⚽ GOAL for Gold! A spectacular long-range blast. Score: Blue ${scoreBlue} - Gold ${scoreGold}`);
    }
  }
}, 5000);

/**
 * @route GET /api/match/status
 * @description Retrieves the current match scoreboard values (scores, elapsed time, commentary feed).
 * @access Public
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    scoreBlue,
    scoreGold,
    clockMinutes,
    clockSeconds,
    commentary,
  });
});

/**
 * @route POST /api/match/commentary
 * @description Triggers a new GenAI commentary line based on the preferred presentation style.
 * @param {string} req.body.style - Commentary tone ('neutral' | 'hype' | 'tactical')
 * @returns {object} Commentary entry and updated commentaries array
 * @access Public
 */
router.post('/commentary', async (req: Request, res: Response): Promise<void> => {
  const parseResult = MatchCommentaryRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid commentary style',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const { style } = parseResult.data;

  try {
    const prompt = `Generate a single short sentence of live football match commentary for a match between Blue and Gold.
    Current Score: Blue ${scoreBlue} - Gold ${scoreGold}.
    Game Minute: ${clockMinutes}.
    Tone/Style: ${style} (Neutral = objective analysis, Hype = screaming energetic excitement, Tactical = formation and player position breakdown).
    Keep it under 25 words. Do not wrap in quotes.`;

    const result = await llmCall({
      system: 'You are a sports commentator.',
      user: prompt,
      tier: 'fast',
    });
    const text = result.text.replace(/["']/g, '').trim();
    const entry = `[${clockMinutes}'] AI (${style}): ${text}`;
    commentary.unshift(entry);
    res.json({ entry, commentary });
  } catch (err) {
    const fallbackText = `Tactical stalemate continues on the pitch as both midfields fight for possession.`;
    const entry = `[${clockMinutes}'] AI (${style}): ${fallbackText}`;
    commentary.unshift(entry);
    res.json({ entry, commentary });
  }
});

/**
 * Resets the in-memory match simulation variables.
 * Designed primarily for unit and integration testing.
 */
export function resetMatchForTest() {
  scoreBlue = 0;
  scoreGold = 0;
  clockMinutes = 0;
  clockSeconds = 0;
  commentary = ['The teams are still in the tunnel.'];
}

export default router;
