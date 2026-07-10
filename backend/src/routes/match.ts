import { Router, type Request, type Response } from 'express';
import { MatchCommentaryRequestSchema } from '../types/index.js';
import { llmCall } from '../services/llmClient.js';

const router = Router();

let scoreBlue = 0;
let scoreGold = 0;
let clockMinutes = 0;
let clockSeconds = 0;
let commentary: string[] = ['The teams are still in the tunnel.'];

// Background simulation loop
let matchInterval = setInterval(() => {
  clockSeconds += 15; // Speed up game time for demo
  if (clockSeconds >= 60) {
    clockMinutes += 1;
    clockSeconds = 0;
  }

  if (clockMinutes >= 90) {
    clearInterval(matchInterval);
    commentary.unshift(`[90'] 🏁 Full Time! Blue ${scoreBlue} - Gold ${scoreGold}`);
    return;
  }

  // Random events: 3% chance of goal every tick
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

// GET /api/match/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    scoreBlue,
    scoreGold,
    clockMinutes,
    clockSeconds,
    commentary,
  });
});

// POST /api/match/commentary
router.post('/commentary', async (req: Request, res: Response): Promise<void> => {
  const parseResult = MatchCommentaryRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid commentary style', details: parseResult.error.flatten() });
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

// Reset match (helper for testing)
export function resetMatchForTest() {
  scoreBlue = 0;
  scoreGold = 0;
  clockMinutes = 0;
  clockSeconds = 0;
  commentary = ['The teams are still in the tunnel.'];
}

export default router;
