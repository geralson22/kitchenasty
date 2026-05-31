import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { count: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    menuOption: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    menuOptionValue: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);

const app = createApp();

const sampleMenuItem = {
  id: 'item-1',
  name: 'Margherita Pizza',
  price: 14.99,
  isActive: true,
  trackStock: false,
  stockQty: 0,
  options: [
    {
      id: 'opt-1',
      name: 'Size',
      values: [
        { id: 'val-1', name: 'Small', priceModifier: 0 },
        { id: 'val-2', name: 'Large', priceModifier: 3 },
      ],
    },
  ],
};

describe('Cart Validation API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orders/validate', () => {
    it('returns valid for unchanged cart items', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([
        { id: 'val-1', priceModifier: 0 },
        { id: 'val-2', priceModifier: 3 },
      ] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 1,
            options: [
              { menuOptionValueId: 'val-1', name: 'Size', value: 'Small', priceModifier: 0 },
            ],
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.invalidItems).toHaveLength(0);
    });

    it('returns invalid for deleted menu item', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 1,
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-1', reason: 'PRODUCT_DELETED' })
      );
    });

    it('returns invalid for price change', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([{ ...sampleMenuItem, price: 19.99 }] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 1,
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-1', reason: 'PRODUCT_UPDATED' })
      );
    });

    it('returns invalid for out of stock', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([{ ...sampleMenuItem, trackStock: true, stockQty: 2 }] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 5,
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-1', reason: 'OUT_OF_STOCK' })
      );
    });

    it('returns invalid for deleted option value', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 1,
            options: [
              { menuOptionValueId: 'val-1', name: 'Size', value: 'Small', priceModifier: 0 },
            ],
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-1', reason: 'OPTION_DELETED' })
      );
    });

    it('returns invalid for changed option price', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([
        { id: 'val-1', priceModifier: 5 },
      ] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          {
            menuItemId: 'item-1',
            name: 'Margherita Pizza',
            price: 14.99,
            quantity: 1,
            options: [
              { menuOptionValueId: 'val-1', name: 'Size', value: 'Small', priceModifier: 0 },
            ],
          },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-1', reason: 'OPTION_CHANGED' })
      );
    });

    it('returns 400 for empty items array', async () => {
      const res = await request(app).post('/api/orders/validate').send({
        items: [],
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing items', async () => {
      const res = await request(app).post('/api/orders/validate').send({});

      expect(res.status).toBe(400);
    });

    it('validates multiple items and reports all issues', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Pizza 1', price: 14.99, isActive: true, trackStock: false, stockQty: 0, options: [] },
        { id: 'item-2', name: 'Pizza 2', price: 12.99, isActive: true, trackStock: true, stockQty: 1, options: [] },
      ] as any);
      mockedPrisma.menuOptionValue.findMany.mockResolvedValue([] as any);

      const res = await request(app).post('/api/orders/validate').send({
        items: [
          { menuItemId: 'item-1', name: 'Pizza 1', price: 14.99, quantity: 1 },
          { menuItemId: 'item-2', name: 'Pizza 2', price: 12.99, quantity: 10 },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.invalidItems).toHaveLength(1);
      expect(res.body.invalidItems).toContainEqual(
        expect.objectContaining({ menuItemId: 'item-2', reason: 'OUT_OF_STOCK' })
      );
    });
  });
});