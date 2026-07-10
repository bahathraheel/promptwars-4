import { Router, type Request, type Response } from 'express';
import { FoodOrderRequestSchema } from '../types/index.js';

const router = Router();

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
      { name: 'Classic Burger', price: 14, tags: [] },
      { name: 'Chicken Tenders', price: 12, tags: [] },
      { name: 'Loaded Fries', price: 9, tags: ['Vegetarian'] },
      { name: 'Soft Drink', price: 6, tags: ['Vegetarian', 'Vegan'] },
    ],
  },
  {
    id: 'stand-s-3',
    name: 'South Garden Stand',
    zone: 'South Concourses',
    waitTimeMinutes: 5,
    menu: [
      { name: 'Classic Burger', price: 14, tags: [] },
      { name: 'Chicken Tenders', price: 12, tags: [] },
      { name: 'Loaded Fries', price: 9, tags: ['Vegetarian'] },
      { name: 'Soft Drink', price: 6, tags: ['Vegetarian', 'Vegan'] },
    ],
  },
  {
    id: 'stand-w-4',
    name: 'West Pizza Corner',
    zone: 'West Concourses',
    waitTimeMinutes: 12,
    menu: [
      { name: 'Classic Burger', price: 14, tags: [] },
      { name: 'Chicken Tenders', price: 12, tags: [] },
      { name: 'Loaded Fries', price: 9, tags: ['Vegetarian'] },
      { name: 'Soft Drink', price: 6, tags: ['Vegetarian', 'Vegan'] },
    ],
  },
];

// GET /api/concessions/stands
router.get('/stands', (_req: Request, res: Response) => {
  // Add minor variance to wait times for live effect
  const stands = CONCESSION_STANDS.map((s) => ({
    ...s,
    waitTimeMinutes: Math.max(2, s.waitTimeMinutes + Math.floor(Math.random() * 5) - 2),
  }));
  res.json({ stands });
});

// POST /api/concessions/order
router.post('/order', (req: Request, res: Response): void => {
  const parseResult = FoodOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid order structure', details: parseResult.error.flatten() });
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
