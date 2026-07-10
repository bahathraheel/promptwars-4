/**
 * @file concessions.ts
 * @description StadiumPulse AI – Concessions and concessions ordering routes.
 * Serves menus, dynamic queue wait time estimates, and validates incoming concessions orders.
 */

import { Router, type Request, type Response } from 'express';
import { FoodOrderRequestSchema } from '../types/index.js';

const router = Router();

/**
 * In-memory concessions stands mapping. We provide venue-specific, localized 
 * foods for key stadiums based on real-world menus, and a default for others.
 */
const DEFAULT_STANDS = [
  { id: 'stand-n-1', name: 'North Grill House', zone: 'North Concourses', waitTimeMinutes: 8, menu: [
      { name: 'Classic Burger', price: 14, tags: [] },
      { name: 'Chicken Tenders', price: 12, tags: [] },
      { name: 'Loaded Fries', price: 9, tags: ['Vegetarian'] },
      { name: 'Soft Drink', price: 6, tags: ['Vegetarian', 'Vegan'] }
  ]}
];

const VENUE_STANDS: Record<string, any[]> = {
  'mex-azteca': [
    { id: 'azteca-1', name: 'Taquería Azteca', zone: 'Sector Norte', waitTimeMinutes: 10, menu: [
      { name: 'Tacos al Pastor (3)', price: 120, tags: ['Local'] },
      { name: 'Tamales de Mole', price: 85, tags: ['Local'] },
      { name: 'Elotes', price: 50, tags: ['Vegetarian', 'Local'] },
      { name: 'Mexican Coke', price: 40, tags: ['Vegan'] }
    ]},
    { id: 'azteca-2', name: 'Cantina Sur', zone: 'Sector Sur', waitTimeMinutes: 5, menu: [
      { name: 'Torta Ahogada', price: 130, tags: ['Local'] },
      { name: 'Guacamole & Chips', price: 90, tags: ['Vegan', 'Vegetarian'] },
      { name: 'Agua de Jamaica', price: 35, tags: ['Vegan'] }
    ]}
  ],
  'usa-metlife': [
    { id: 'metlife-1', name: 'NY Slice Corner', zone: 'Gate A Concourse', waitTimeMinutes: 15, menu: [
      { name: 'NY-Style Cheese Pizza', price: 8, tags: ['Vegetarian', 'Local'] },
      { name: 'Pepperoni Slice', price: 9, tags: [] },
      { name: 'Garlic Knots', price: 6, tags: ['Vegetarian'] },
      { name: 'Fountain Soda', price: 5, tags: ['Vegan'] }
    ]},
    { id: 'metlife-2', name: 'Boardwalk Hot Dogs', zone: 'Gate D Concourse', waitTimeMinutes: 7, menu: [
      { name: 'Classic NYC Hot Dog', price: 7, tags: ['Local'] },
      { name: 'Jumbo Soft Pretzel', price: 8, tags: ['Vegetarian'] },
      { name: 'Loaded Nachos', price: 10, tags: ['Vegetarian'] }
    ]}
  ],
  'usa-mercedes': [
    { id: 'mercedes-1', name: 'Southern BBQ Pit', zone: '100 Level', waitTimeMinutes: 12, menu: [
      { name: 'Pulled Pork Sandwich', price: 14, tags: ['Local'] },
      { name: 'Fried Chicken Tenders', price: 12, tags: [] },
      { name: 'Mac & Cheese', price: 7, tags: ['Vegetarian'] },
      { name: 'Sweet Tea', price: 4, tags: ['Vegan', 'Local'] }
    ]}
  ],
  'can-bc-place': [
    { id: 'bc-1', name: 'Pacific Catch', zone: 'Level 2', waitTimeMinutes: 8, menu: [
      { name: 'Pacific Salmon Burger', price: 16, tags: ['Pescatarian', 'Local'] },
      { name: 'Classic Poutine', price: 11, tags: ['Vegetarian', 'Local'] },
      { name: 'Maple Glazed Donut', price: 5, tags: ['Vegetarian'] },
      { name: 'Craft IPA Beer', price: 12, tags: ['Local'] }
    ]}
  ]
};

/**
 * @route GET /api/concessions/stands
 * @description Retrieves a list of concession stands. If ?venueId= is provided, 
 * returns venue-specific localized menus. Otherwise returns generic defaults.
 * @access Public
 */
router.get('/stands', (req: Request, res: Response) => {
  const venueId = req.query.venueId as string;
  let baseStands = DEFAULT_STANDS;
  
  if (venueId && VENUE_STANDS[venueId]) {
    baseStands = VENUE_STANDS[venueId];
  }

  // Add minor variance to wait times for live simulation effect
  const stands = baseStands.map((s) => ({
    ...s,
    waitTimeMinutes: Math.max(2, s.waitTimeMinutes + Math.floor(Math.random() * 5) - 2),
  }));
  res.json({ stands });
});

/**
 * @route POST /api/concessions/order
 * @description Places a food order at a chosen stand. Body is validated against FoodOrderRequestSchema.
 * @param {string} req.body.standId - Target stand identifier
 * @param {Array} req.body.items - Menu items ordered with quantity and price details
 * @param {number} req.body.totalPrice - Computed order subtotal
 * @returns {object} Confirmed order ID, preparation state, and pickup countdown
 * @access Public
 */
router.post('/order', (req: Request, res: Response): void => {
  const parseResult = FoodOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid order structure',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const orderId = `ord-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  res.status(200).json({
    success: true,
    orderId,
    status: 'preparing',
    estimatedMinutes: 10,
    timestamp: new Date().toISOString(),
  });
});

export default router;
