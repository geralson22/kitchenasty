import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const cartItemOptionSchema = z.object({
  menuOptionValueId: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  priceModifier: z.number(),
});

const cartItemSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  comment: z.string().optional(),
  options: z.array(cartItemOptionSchema).optional(),
});

const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1),
});

type InvalidItem = {
  menuItemId: string;
  name: string;
  reason: 'PRODUCT_DELETED' | 'PRODUCT_UPDATED' | 'OPTION_CHANGED' | 'OPTION_DELETED' | 'OUT_OF_STOCK';
};

export async function validateCart(req: Request, res: Response): Promise<void> {
  const parsed = validateCartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { items } = parsed.data;
  const menuItemIds = items.map((i) => i.menuItemId);

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      options: {
        include: { values: true },
      },
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
  const invalidItems: InvalidItem[] = [];

  const allOptionValueIds = items.flatMap((i) => i.options?.map((o) => o.menuOptionValueId) ?? []);
  const menuOptionValues = await prisma.menuOptionValue.findMany({
    where: { id: { in: allOptionValueIds } },
  });
  const menuOptionValueMap = new Map(menuOptionValues.map((v) => [v.id, v]));

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);

    if (!menuItem || !menuItem.isActive) {
      invalidItems.push({ menuItemId: item.menuItemId, name: item.name, reason: 'PRODUCT_DELETED' });
      continue;
    }

    if (menuItem.price !== item.price) {
      invalidItems.push({ menuItemId: item.menuItemId, name: item.name, reason: 'PRODUCT_UPDATED' });
      continue;
    }

    if (menuItem.trackStock && menuItem.stockQty < item.quantity) {
      invalidItems.push({ menuItemId: item.menuItemId, name: item.name, reason: 'OUT_OF_STOCK' });
      continue;
    }

    if (!item.options || item.options.length === 0) {
      continue;
    }

    for (const cartOpt of item.options) {
      const menuVal = menuOptionValueMap.get(cartOpt.menuOptionValueId);
      if (!menuVal) {
        invalidItems.push({ menuItemId: item.menuItemId, name: item.name, reason: 'OPTION_DELETED' });
        break;
      }
      if (menuVal.priceModifier !== cartOpt.priceModifier) {
        invalidItems.push({ menuItemId: item.menuItemId, name: item.name, reason: 'OPTION_CHANGED' });
        break;
      }
    }
  }

  res.json({
    success: true,
    valid: invalidItems.length === 0,
    invalidItems,
  });
}