/**
 * @file volunteer.ts
 * @description StadiumPulse AI – Volunteer management & incident reporting routing.
 * Provides Ground Briefing checklists and accepts real-time gate incidents from stewards.
 */

import { Router, type Request, type Response } from 'express';
import { VolunteerIncidentSchema } from '../types/index.js';
import { addProposedAction } from '../services/auditStore.js';
import type { ProposedAction } from '../types/index.js';

const router = Router();

/**
 * @route GET /api/volunteer/briefings
 * @description Retrieves active safety briefings, weather alerts, and transit advisories.
 * @access Public
 */
router.get('/briefings', (_req: Request, res: Response) => {
  res.json({
    briefings: [
      { id: 'b1', title: 'Crowd Flow Check', content: 'Gate C occupancy is elevated. Direct incoming fans to Gate D if queues exceed 15 mins.', category: 'safety' },
      { id: 'b2', title: 'Weather Notice', content: 'Mild showers expected at 8:00 PM. Hand out ponchos near entrance gates.', category: 'weather' },
      { id: 'b3', title: 'Transit Advisory', content: 'Shuttle Bus Route B experiencing a 10 min delay due to local traffic. Inform departing fans.', category: 'transit' }
    ]
  });
});

/**
 * @route POST /api/volunteer/incident
 * @description Submits a ground incident alert from a volunteer.
 * Incident details are validated and forwarded directly to the Operations Dashboard proposed actions queue.
 * @param {string} req.body.category - Incident type ('medical' | 'congestion' | 'facility' | 'security' | 'other')
 * @param {string} req.body.gateId - Gate location identifier
 * @param {string} req.body.severity - Severity rating ('low' | 'medium' | 'high')
 * @param {string} req.body.description - Descriptive description of the event
 * @returns {object} Status code confirmation and mapped action ID
 * @access Public
 */
router.post('/incident', (req: Request, res: Response): void => {
  const parseResult = VolunteerIncidentSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({
       error: 'Invalid incident report',
       code: 'VALIDATION_ERROR',
       details: parseResult.error.flatten(),
     });
     return;
  }

  const { category, gateId, severity, description } = parseResult.data;

  // Map volunteer incident category to ProposedAction schema category
  let actionCategory: 'medical_alert' | 'reroute_fans' | 'redeploy_volunteers' | 'pa_announcement' | 'other' = 'other';
  if (category === 'medical') actionCategory = 'medical_alert';
  else if (category === 'congestion') actionCategory = 'reroute_fans';
  else if (category === 'facility') actionCategory = 'redeploy_volunteers';
  else if (category === 'security') actionCategory = 'medical_alert';

  // Determine priority
  let priority = 5;
  if (severity === 'high') priority = 2;
  else if (severity === 'low') priority = 8;

  const action: ProposedAction = {
    id: `act-vol-${Date.now().toString().slice(-6)}`,
    category: actionCategory,
    title: `Volunteer Alert: ${category.toUpperCase()} at ${gateId}`,
    description: `Reported issue: ${description}. Severity: ${severity.toUpperCase()}.`,
    confidence: 1.0,
    rationale: `Reported directly by on-duty gate volunteer.`,
    affectedGates: [gateId],
    priority,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // Add directly to Ops Dashboard proposed actions
  addProposedAction(action);

  res.json({
    success: true,
    actionId: action.id,
    message: 'Incident reported successfully and routed to operations command center.',
  });
});

export default router;
