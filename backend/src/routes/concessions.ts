/**
 * @file concessions.ts
 * @description StadiumPulse AI – Concessions and concessions ordering routes.
 * Serves menus, dynamic queue wait time estimates, and validates incoming concessions orders.
 */

import { Router, type Request, type Response } from 'express';
import { FoodOrderRequestSchema } from '../types/index.js';

const router = Router();

/**
 * In-memory concessions stands data with items, pricing, and dietary labels.
 */
const CONCESSION_STANDS = [
  {
    id: 'stand-n-1',
    name: 'North Grill House',
    zone: 'North Concourses',
    waitTimeMinutes: 8,
    menu: [
      { name: 'Classic Burger', price: 14, tags: [] },
      { name: 'Chicken Tenders', price: 12, tags: [] },
      { name: 'Loaded Fries', price: 9, tags: ['Vegetarian'] },
      { name: 'Soft Drink', price: 6, tags: ['Vegetarian', 'Vegan'] },
    ],
  },
  {
    id: 'stand-e-2',
    name: 'East Halal Kitchen',
    zone: 'East Concourses',
    waitTimeMinutes: 15,
    menu: [
      { name: 'Halal Chicken Platter', price: 15, tags: ['Halal'] },
      { name: 'Lamb Gyro', price: 13, tags: ['Halal'] },
      { name: 'Falafel Wrap', price: 11, tags: ['Halal', 'Vegetarian'] },
      { name: 'Bottled Water', price: 4, tags: ['Vegan'] },
    ],
  },
  {
    id: 'stand-s-3',
    name: 'South Garden Stand',
    zone: 'South Concourses',
    waitTimeMinutes: 5,
    menu: [
      { name: 'Vegan Beyond Burger', price: 16, tags: ['Vegan', 'Vegetarian'] },
      { name: 'Garden Salad', price: 10, tags: ['Vegan', 'Vegetarian'] },
      { name: 'Fruit Cup', price: 7, tags: ['Vegan', 'Gluten-Free'] },
      { name: 'Kombucha', price: 8, tags: ['Vegan'] },
    ],
  },
  {
    id: 'stand-w-4',
    name: 'West Pizza Corner',
    zone: 'West Concourses',
    waitTimeMinutes: 12,
    menu: [
      { name: 'Cheese Pizza Slice', price: 8, tags: ['Vegetarian'] },
      { name: 'Pepperoni Pizza Slice', price: 9, tags: [] },
      { name: 'Garlic Knots', price: 6, tags: ['Vegetarian'] },
      { name: 'Craft Beer', price: 12, tags: [] },
    ],
  },
];

/**
 * @route GET /api/concessions/stands
 * @description Retrieves a list of all concession stands along with live-toggled wait times and menus.
 * @access Public
 */
router.get('/stands', (_req: Request, res: Response) => {
  // Add minor variance to wait times for live simulation effect
  const stands = CONCESSION_STANDS.map((s) => ({
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
