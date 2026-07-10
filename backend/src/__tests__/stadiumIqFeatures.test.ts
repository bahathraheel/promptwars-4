import request from 'supertest';
import app from '../app';
import { getAllActions, clearStore } from '../services/auditStore';
import { resetMatchForTest } from '../routes/match';

jest.mock('../services/llmClient', () => ({
  llmCall: jest.fn().mockResolvedValue({
    text: 'A thrilling game style matched perfectly.',
    modelUsed: 'mock-fast-stadiumiq',
    inputTokens: 10,
    outputTokens: 20,
  }),
  MODEL_NAMES: {
    fast: 'mock-fast',
    balanced: 'mock-balanced',
    reasoning: 'mock-reasoning',
  },
}));

describe('SECTION 9: Match Center Scores & GenAI Commentary (5 Tests)', () => {
  beforeEach(() => {
    resetMatchForTest();
  });

  test('Test 103: GET /api/match/status returns scoreboard and commentary list', async () => {
    const res = await request(app)
      .get('/api/match/status')
      .expect(200);
    expect(res.body).toHaveProperty('scoreBlue');
    expect(res.body).toHaveProperty('scoreGold');
    expect(res.body).toHaveProperty('clockMinutes');
    expect(res.body).toHaveProperty('commentary');
    expect(Array.isArray(res.body.commentary)).toBe(true);
  });

  test('Test 104: POST /api/match/commentary rejects invalid commentary style', async () => {
    const res = await request(app)
      .post('/api/match/commentary')
      .send({ style: 'invalid-style' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 105: POST /api/match/commentary accepts neutral style and appends log', async () => {
    const res = await request(app)
      .post('/api/match/commentary')
      .send({ style: 'neutral' })
      .expect(200);
    expect(res.body).toHaveProperty('entry');
    expect(res.body.entry).toContain('neutral');
  });

  test('Test 106: POST /api/match/commentary accepts hype style and returns entry', async () => {
    const res = await request(app)
      .post('/api/match/commentary')
      .send({ style: 'hype' })
      .expect(200);
    expect(res.body.entry).toContain('hype');
  });

  test('Test 107: POST /api/match/commentary accepts tactical style', async () => {
    const res = await request(app)
      .post('/api/match/commentary')
      .send({ style: 'tactical' })
      .expect(200);
    expect(res.body.entry).toContain('tactical');
  });
});

describe('SECTION 10: Concessions Food Ordering Rules (5 Tests)', () => {
  test('Test 108: GET /api/concessions/stands returns stands list with wait times', async () => {
    const res = await request(app)
      .get('/api/concessions/stands')
      .expect(200);
    expect(res.body).toHaveProperty('stands');
    expect(Array.isArray(res.body.stands)).toBe(true);
    expect(res.body.stands[0]).toHaveProperty('waitTimeMinutes');
    expect(res.body.stands[0]).toHaveProperty('menu');
  });

  test('Test 109: POST /api/concessions/order rejects empty cart', async () => {
    const res = await request(app)
      .post('/api/concessions/order')
      .send({ standId: 'stand-n-1', items: [], totalPrice: 0 })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 110: POST /api/concessions/order rejects invalid item quantity', async () => {
    const res = await request(app)
      .post('/api/concessions/order')
      .send({
        standId: 'stand-n-1',
        items: [{ name: 'Classic Burger', quantity: 0, price: 14 }],
        totalPrice: 14,
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 111: POST /api/concessions/order rejects negative price', async () => {
    const res = await request(app)
      .post('/api/concessions/order')
      .send({
        standId: 'stand-n-1',
        items: [{ name: 'Classic Burger', quantity: 1, price: -5 }],
        totalPrice: -5,
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 112: POST /api/concessions/order accepts valid order payload', async () => {
    const res = await request(app)
      .post('/api/concessions/order')
      .send({
        standId: 'stand-n-1',
        items: [{ name: 'Classic Burger', quantity: 2, price: 14 }],
        totalPrice: 28,
      })
      .expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('orderId');
    expect(res.body).toHaveProperty('status', 'preparing');
  });
});

describe('SECTION 11: Volunteer Hub & Incident Triage Pipeline (5 Tests)', () => {
  beforeEach(() => {
    clearStore();
  });

  test('Test 113: GET /api/volunteer/briefings returns volunteer safety checklists', async () => {
    const res = await request(app)
      .get('/api/volunteer/briefings')
      .expect(200);
    expect(res.body).toHaveProperty('briefings');
    expect(Array.isArray(res.body.briefings)).toBe(true);
  });

  test('Test 114: POST /api/volunteer/incident rejects invalid category options', async () => {
    const res = await request(app)
      .post('/api/volunteer/incident')
      .send({ category: 'invalid-cat', gateId: 'gate-3', severity: 'medium', description: 'Crowd surge safety check' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 115: POST /api/volunteer/incident rejects descriptions shorter than 5 characters', async () => {
    const res = await request(app)
      .post('/api/volunteer/incident')
      .send({ category: 'congestion', gateId: 'gate-3', severity: 'medium', description: 'test' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Test 116: POST /api/volunteer/incident accepts valid incident parameters', async () => {
    const res = await request(app)
      .post('/api/volunteer/incident')
      .send({
        category: 'medical',
        gateId: 'gate-3',
        severity: 'high',
        description: 'First aid assistance needed near South entrance Gate 3.',
      })
      .expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('actionId');
  });

  test('Test 117: Submitting volunteer incident pushes ProposedAction to Operations Dashboard', async () => {
    expect(getAllActions().length).toBe(0);

    await request(app)
      .post('/api/volunteer/incident')
      .send({
        category: 'congestion',
        gateId: 'gate-1',
        severity: 'high',
        description: 'Gate 1 queues backing up past turnstiles, assistance requested.',
      })
      .expect(200);

    const actions = getAllActions();
    expect(actions.length).toBe(1);
    expect(actions[0].title).toContain('Volunteer Alert: CONGESTION');
    expect(actions[0].affectedGates).toContain('gate-1');
    expect(actions[0].priority).toBe(2); // high maps to 2
  });
});

describe('SECTION 12: Capabilities and Tournament Grounding (2 Tests)', () => {
  test('Test 118: GET /api/capabilities retrieves 2026 data coordinates (16 venues, 48 teams, Azteca, MetLife)', async () => {
    const res = await request(app)
      .get('/api/capabilities')
      .expect(200);
    expect(res.body).toHaveProperty('worldCup2026');
    expect(res.body.worldCup2026.venuesCount).toBe(16);
    expect(res.body.worldCup2026.teamsCount).toBe(48);
    expect(res.body.worldCup2026.openingVenue).toContain('Azteca');
    expect(res.body.worldCup2026.finalVenue).toContain('MetLife');
  });

  test('Test 119: GET /api/capabilities lists all 8 capability areas and 4 named audiences', async () => {
    const res = await request(app)
      .get('/api/capabilities')
      .expect(200);
    expect(res.body).toHaveProperty('capabilities');
    expect(res.body).toHaveProperty('audiences');
    expect(res.body.capabilities.length).toBe(8);
    expect(res.body.audiences.length).toBe(4);
  });
});

describe('SECTION 13: Capability Areas Table Mappings (9 Tests)', () => {
  test('Test 120: POST /api/concierge returns RAG reply', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ message: 'What is the bag policy?', language: 'Spanish' })
      .expect(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body).toHaveProperty('detectedLanguage', 'Spanish');
  });

  test('Test 121: POST /api/navigate calculates Dijkstra route and supports stepFree', async () => {
    const res = await request(app)
      .post('/api/navigate')
      .send({ from: 'gate-1', to: 'sec-300', stepFree: true })
      .expect(200);
    expect(res.body).toHaveProperty('path');
    expect(res.body).toHaveProperty('distance');
    expect(res.body).toHaveProperty('stepFreeActive', true);
  });

  test('Test 122: GET /api/crowd/:venueId returns zone alert states and occupancy', async () => {
    const res = await request(app)
      .get('/api/crowd/venue-metlife')
      .expect(200);
    expect(res.body).toHaveProperty('overallOccupancyPct');
    expect(res.body).toHaveProperty('zones');
    expect(Array.isArray(res.body.zones)).toBe(true);
  });

  test('Test 123: POST /api/incident triages incidents, sets SLA, and routes to dashboard', async () => {
    const res = await request(app)
      .post('/api/incident')
      .send({ category: 'medical', gateId: 'gate-2', severity: 'high', description: 'Steward slips' })
      .expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('slaMinutes', 5);
    expect(res.body).toHaveProperty('dispatchTeam');
    expect(res.body).toHaveProperty('escalationContact');
  });

  test('Test 124: POST /api/announce translates public safety announcements', async () => {
    const res = await request(app)
      .post('/api/announce')
      .send({ message: 'Ramp closed', targetLanguage: 'French' })
      .expect(200);
    expect(res.body).toHaveProperty('translated');
    expect(res.body).toHaveProperty('announcementScript');
  });

  test('Test 125: POST /api/briefing generates shift briefs', async () => {
    const res = await request(app)
      .post('/api/briefing')
      .send({ role: 'steward' })
      .expect(200);
    expect(res.body).toHaveProperty('duties');
    expect(res.body).toHaveProperty('escalationInstructions');
    expect(res.body).toHaveProperty('phrases');
  });

  test('Test 126: POST /api/sustainability/footprint calculates CO2 comparison', async () => {
    const res = await request(app)
      .post('/api/sustainability/footprint')
      .send({ item: 'cup', routeId: 'route-downtown' })
      .expect(200);
    expect(res.body).toHaveProperty('carCO2kg');
    expect(res.body).toHaveProperty('metroCO2kg');
    expect(res.body).toHaveProperty('nudgeText');
  });

  test('Test 127: GET /api/plan/:venueId retrieves arrival plan timetables', async () => {
    const res = await request(app)
      .get('/api/plan/venue-metlife')
      .expect(200);
    expect(res.body).toHaveProperty('fixture');
    expect(res.body).toHaveProperty('recommendedArrivalWindow');
    expect(res.body).toHaveProperty('steps');
  });

  test('Test 128: POST /api/translate performs on-demand translations', async () => {
    const res = await request(app)
      .post('/api/translate')
      .send({ text: 'Where is the exit?', targetLanguage: 'Arabic' })
      .expect(200);
    expect(res.body).toHaveProperty('translatedText');
    expect(res.body).toHaveProperty('targetLanguage', 'Arabic');
  });
});
