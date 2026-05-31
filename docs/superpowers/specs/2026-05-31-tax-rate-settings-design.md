# Tax Rate Settings — Implementation Design

## Context

The admin panel at `/settings/order` exposes a `taxRate` input (0-100%), persisted to `SiteSettings.orderSettings.taxRate`. However, this value is never read. All order tax calculations use a hardcoded `0.08` (8%) in three places:

| Location | File | Line |
|----------|------|------|
| Server order creation | `packages/server/src/controllers/order.controller.ts` | 312 |
| Storefront checkout | `packages/storefront/src/pages/Checkout.tsx` | 11 |
| Mobile checkout | `packages/mobile/src/lib/constants.ts` | 6 |

Additionally, tax display in order detail views is unconditional — the tax line renders even when `tax === 0`.

## Goal

Connect the admin-configured `taxRate` to actual order tax calculation, and conditionally hide the tax line item when tax is zero.

## Decisions

1. **Tax rate locked at order time** — Historical orders preserve their tax amount even if settings change. The `tax` field is calculated once during `order.create` and stored.

2. **Zero-tax line hidden** — Display components omit the tax line when `order.tax === 0` or the computed tax is `0`. No `$0.00` placeholder shown.

3. **Global rate** — Single `taxRate` value in `orderSettings`, not per-branding.

## Changes

### 1. Server — Order Controller (`packages/server/src/controllers/order.controller.ts`)

Before creating the order, fetch `taxRate` from settings and calculate tax.

```typescript
// Fetch current tax rate from settings
const settingsRow = await prisma.siteSettings.findFirst();
const orderSettings = settingsRow?.orderSettings as Record<string, any> || {};
const taxRate = (orderSettings.taxRate ?? 0) / 100;  // e.g., 8 → 0.08

const tax = subtotal * taxRate;
const total = subtotal + tax + deliveryFee - totalDiscount;
```

The `tax` and `total` are stored on the order record.

### 2. Server — Settings Controller (`packages/server/src/controllers/settings.controller.ts`)

No schema changes needed. The `taxRate` field already exists in `orderSettingsSchema` (line 191). Add a small helper for reuse if needed, but not required.

### 3. Storefront — Checkout (`packages/storefront/src/pages/Checkout.tsx`)

Remove hardcoded `const TAX_RATE = 0.08`. The order creation API now returns the calculated tax — no need to recalculate client-side. The tax line in the order summary is conditional:

```tsx
{tax > 0 && (
  <div>...</div>
)}
```

### 4. Admin — Order Detail (`packages/admin/src/pages/OrderDetail.tsx`)

In both the print invoice and web UI, conditionally render tax when `order.tax > 0`:

```tsx
{order.tax > 0 && (
  <div>Tax: ${order.tax.toFixed(2)}</div>
)}
```

### 5. Storefront — Order Status (`packages/storefront/src/pages/OrderStatus.tsx`)

Same conditional render for tax line when `order.tax > 0`.

### 6. Mobile App — EXPLICITLY OUT OF SCOPE

The mobile package (`packages/mobile`) is managed separately and **must not be modified**. The mobile app will continue using its hardcoded tax rate independently.

## Important Notes

- **DO NOT commit or stage any changes** — complete implementation but leave changes uncommitted
- **DO NOT modify mobile app** — `packages/mobile` is out of scope

## Files Summary

| File | Action |
|------|--------|
| `packages/server/src/controllers/order.controller.ts` | Fetch taxRate from settings, remove hardcoded TAX_RATE |
| `packages/storefront/src/pages/Checkout.tsx` | Remove hardcoded TAX_RATE, add conditional tax render |
| `packages/admin/src/pages/OrderDetail.tsx` | Add conditional tax render |
| `packages/storefront/src/pages/OrderStatus.tsx` | Add conditional tax render |

## Verification

- Admin sets `taxRate = 0` → orders created have `tax = 0` → tax line hidden everywhere
- Admin sets `taxRate = 8` → orders created have `tax = subtotal * 0.08` → tax line shown
- Existing orders retain their stored tax value regardless of setting changes
- No changes to mobile (out of scope)
