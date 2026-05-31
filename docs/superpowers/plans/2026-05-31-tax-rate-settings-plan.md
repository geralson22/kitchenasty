# Tax Rate Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the admin-configured `taxRate` to order tax calculation; conditionally hide tax line when tax is zero.

**Architecture:** Server fetches `taxRate` from `SiteSettings.orderSettings` during order creation, calculates tax once and stores it on the Order record. All clients display the stored `order.tax` value. Tax line is conditionally rendered only when `tax > 0`.

**Tech Stack:** Express + Prisma (server), React + Tailwind (admin/frontend)

**Important: DO NOT commit or stage any changes. DO NOT modify the mobile app.**

---

## File Map

| File | Change |
|------|--------|
| `packages/server/src/controllers/order.controller.ts` | Fetch `taxRate` from settings; remove hardcoded `TAX_RATE` |
| `packages/storefront/src/pages/Checkout.tsx` | Remove hardcoded `TAX_RATE`; add conditional tax render |
| `packages/admin/src/pages/OrderDetail.tsx` | Add conditional tax render |
| `packages/storefront/src/pages/OrderStatus.tsx` | Add conditional tax render |

---

## Task 1: Server — Order Controller

**File:** `packages/server/src/controllers/order.controller.ts`

**Context needed:** Lines 50-100 for zone/delivery fee logic, lines 195-230 for coupon handling, lines 300-350 for tax calculation and order creation.

- [ ] **Step 1: Read the file around line 312 to find the hardcoded TAX_RATE**

Read `packages/server/src/controllers/order.controller.ts` offset 310 to 350.

- [ ] **Step 2: Remove hardcoded TAX_RATE and replace with settings fetch**

In the order creation section (around line 312), replace:
```typescript
const TAX_RATE = 0.08;
const tax = subtotal * TAX_RATE;
const total = subtotal + tax + deliveryFee - totalDiscount;
```

With:
```typescript
const settingsRow = await prisma.siteSettings.findFirst();
const orderSettings = (settingsRow?.orderSettings as Record<string, any>) || {};
const taxRate = (orderSettings.taxRate ?? 0) / 100;
const tax = subtotal * taxRate;
const total = subtotal + tax + deliveryFee - totalDiscount;
```

- [ ] **Step 3: Verify the edit**

Run: `npx -w packages/server tsc --noEmit`
Expected: No errors related to tax calculation

---

## Task 2: Storefront — Checkout

**File:** `packages/storefront/src/pages/Checkout.tsx`

**Context needed:** Line 11 for `TAX_RATE`, lines 85-95 for tax calculation, lines 595-605 for tax display.

- [ ] **Step 1: Read line 11 and remove `const TAX_RATE = 0.08`**

The line is `const TAX_RATE = 0.08;` at line 11. Delete it entirely.

- [ ] **Step 2: Read the tax calculation section around line 89**

Read `packages/storefront/src/pages/Checkout.tsx` offset 85 to 95.

- [ ] **Step 3: Replace hardcoded tax calculation with computed from server response**

The tax is now returned from the API on the created order. Replace the local tax calculation with the value from the order response. In the order creation `fetch` call (around line 450-500), capture `tax` from the response instead of calculating client-side. If the API response includes `tax`, use it directly in the order summary display.

- [ ] **Step 4: Read tax display section around lines 595-605**

Read `packages/storefront/src/pages/Checkout.tsx` offset 595 to 610.

- [ ] **Step 5: Wrap tax line in conditional `{tax > 0 && (...)}`**

Find the div that displays tax (label `t('checkout.tax')`). Wrap it:
```tsx
{tax > 0 && (
  <div className="flex justify-between">
    <span className="text-gray-600">{t('checkout.tax')}</span>
    <span>${tax.toFixed(2)}</span>
  </div>
)}
```

- [ ] **Step 6: Verify the edit**

Run: `npx -w packages/storefront tsc --noEmit`
Expected: No errors

---

## Task 3: Admin — Order Detail

**File:** `packages/admin/src/pages/OrderDetail.tsx`

**Context needed:** Lines 260-275 for print invoice tax section, lines 320-335 for web UI tax section.

- [ ] **Step 1: Read print invoice tax section around lines 267-270**

Read `packages/admin/src/pages/OrderDetail.tsx` offset 260 to 275.

- [ ] **Step 2: Wrap print invoice tax line in conditional `{order.tax > 0 && (...)}`**

Replace:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '1px 0' }}>
  <span>{t('tax')}</span>
  <span>${order.tax.toFixed(2)}</span>
</div>
```

With:
```tsx
{order.tax > 0 && (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '1px 0' }}>
    <span>{t('tax')}</span>
    <span>${order.tax.toFixed(2)}</span>
  </div>
)}
```

- [ ] **Step 3: Read web UI tax section around lines 320-330**

Read `packages/admin/src/pages/OrderDetail.tsx` offset 320 to 335.

- [ ] **Step 4: Wrap web UI tax line in conditional**

Same conditional pattern for the web UI section (not print). Find the same tax display structure and wrap it with `{order.tax > 0 && (...)}`.

- [ ] **Step 5: Verify the edit**

Run: `npx -w packages/admin tsc --noEmit`
Expected: No errors

---

## Task 4: Storefront — Order Status

**File:** `packages/storefront/src/pages/OrderStatus.tsx`

**Context needed:** Lines 212-215 for tax display.

- [ ] **Step 1: Read tax display section around lines 212-215**

Read `packages/storefront/src/pages/OrderStatus.tsx` offset 207 to 230.

- [ ] **Step 2: Wrap tax line in conditional `{order.tax > 0 && (...)}`**

Replace:
```tsx
<div className="flex justify-between">
  <span className="text-gray-600">{t('checkout.tax')}</span>
  <span>${order.tax.toFixed(2)}</span>
</div>
```

With:
```tsx
{order.tax > 0 && (
  <div className="flex justify-between">
    <span className="text-gray-600">{t('checkout.tax')}</span>
    <span>${order.tax.toFixed(2)}</span>
  </div>
)}
```

- [ ] **Step 3: Verify the edit**

Run: `npx -w packages/storefront tsc --noEmit`
Expected: No errors

---

## Task 5: Final Verification

- [ ] **Step 1: Run lint across all modified packages**

Run: `npm run lint`
Expected: No errors in modified files

- [ ] **Step 2: Type-check all packages**

Run: `npx tsc --noEmit` (from root)
Expected: No new type errors

---

## Spec Coverage Check

- [x] Admin-configured `taxRate` used in order creation — Task 1
- [x] Tax line hidden when `tax === 0` — Tasks 2, 3, 4
- [x] Server calculates and stores tax — Task 1
- [x] Mobile app unchanged (out of scope) — confirmed
- [x] No commits/staging — explicitly noted
