# KitchenAsty — Agent Guide

## Repo Overview

- **Type**: npm workspaces monorepo (6 packages)
- **Stack**: Express + Prisma + PostgreSQL (backend), React 18 + Vite + Tailwind (admin + storefront), Expo (mobile), VitePress (docs)
- **Node.js**: 22 required

## Package Boundaries

| Package | Role | Key Detail |
|---------|------|------------|
| `packages/shared` | Shared types/constants | Must be built **first** — all other packages depend on it |
| `packages/server` | Express API (port 3000) | Uses `tsx watch` for dev; Zod validation; Pino logging; Socket.IO |
| `packages/admin` | React admin panel (port 5173) | Role-based nav (SUPER_ADMIN / MANAGER / STAFF) |
| `packages/storefront` | React customer storefront (port 5174) | i18n via react-i18next; 10 branding templates |
| `packages/mobile` | Expo/React Native app | `npm run dev:mobile` = `expo start` |
| `packages/docs` | VitePress docs site | Vue-based |

## Prisma — Critical Quirk

The schema lives at **root** `prisma/schema.prisma`, not inside any package. Every Prisma command run via the server workspace needs the `--schema` flag:

```bash
npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
npx -w packages/server prisma db push --schema ../../prisma/schema.prisma
```

**Prisma client must be regenerated** after any schema change, before TypeScript checks or tests will pass.

## Commands

### Setup (first time)

**Docker Compose:**
```bash
npm install
cp .env.example .env                        # Root .env for Docker
docker compose up -d --build
```

**Local dev (outside Docker):**
```bash
npm install
docker compose up -d postgres               # Just the database
cp packages/server/.env.example packages/server/.env
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
```

### Dev servers (run in separate terminals)
```bash
npm run dev:server      # API → :3000  (Swagger at /api/docs)
npm run dev:admin       # Admin → :5173
npm run dev:storefront  # Storefront → :5174
```

### Build (order matters)
```bash
npm run build   # shared → server → admin → storefront
```

### Lint
```bash
npm run lint    # eslint packages/*/src --ext .ts,.tsx (root-level, not per-workspace)
```

### Tests
```bash
npm test                # all unit + integration (requires PostgreSQL running)
npm run test:unit       # shared + server unit tests
npm run test:integration # server integration tests only
npm run test:e2e        # Playwright (auto-starts dev servers; needs PostgreSQL + seeded DB)
```

### Single test file
```bash
npx -w packages/shared vitest run path/to/file.test.ts
npx -w packages/server vitest run path/to/file.test.ts
npx playwright test e2e/admin/some.spec.ts
```

## CI Pipeline (`.github/workflows/ci.yml`)

Four parallel jobs on every PR/push to `main`:
1. **lint** — `npm ci` → Prisma generate → `tsc --noEmit` on all 5 packages
2. **test-unit** — shared + server unit tests
3. **test-integration** — server integration tests (needs PG)
4. **test-e2e** — Playwright (spins up PG + pushes schema + seeds + installs browsers)

Plus: `audit` (npm audit) and `build` (needs lint + unit + integration to pass first).

## Env & Database

**Docker Compose** (production):
- Root `.env` — single source of truth, passed to all containers via `docker-compose.yml`
- Copy `.env.example` to `.env` and customize
- Default DB: `postgresql://kitchenasty:kitchenasty@postgres:5432/kitchenasty` (uses Docker DNS)

**Local dev** (outside Docker):
- `packages/server/.env` — only needed when running `npm run dev:server` directly
- Default DB: `postgresql://kitchenasty:kitchenasty@localhost:5432/kitchenasty`

**Default admin login:** `admin@kitchenasty.com` / `admin123`

## Conventions

- TypeScript strict mode everywhere — no `any`
- Zod for all API input validation
- Relative imports within a package; `@kitchenasty/shared` for cross-package
- Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`

## Toast & Notification System

### ToastProvider (`storefront/src/context/CartContext.tsx`)
Provides in-app toast notifications with 3 types:
- `'error'` — red background
- `'info'` — green background  
- `'prompt'` — blue background (for asking user actions)

```typescript
showToast(messageKey, options?, type?, action?, duration?)
// action: { labelKey: string, onClick: () => void }
// labelKey is automatically translated
```

### Browser Notifications (`storefront/src/hooks/useBrowserNotifications.ts`)
- Uses native `Notification` API
- Hook: `useBrowserNotifications()` returns `{ isSupported, permission, notificationsEnabled, requestPermission, showNotification }`
- Permission stored in `localStorage` key `notifications_enabled`
- Only prompts on `OrderConfirmation` page (not globally)
- Browser support: Desktop Chrome/Firefox ✅, Android Chrome ⚠️, iOS Safari ❌

## VPS Deployment

Production deployment scripts are in `deploy/vps-scripts/`. Copy this folder to your VPS and run `./setup-vps.sh`.

```bash
scp -r deploy/vps-scripts user@vps:/path/to/deploy/
ssh user@vps
cd /path/to/deploy && ./setup-vps.sh
```

### Scripts

| Script | Purpose |
|--------|---------|
| `setup-vps.sh` | Main menu (run individually or all at once) |
| `01-base-system.sh` | Create deploy user, Docker, firewall, unattended upgrades |
| `02-clone-repo.sh` | Generate SSH key, clone repo, create `.env` from template |
| `03-docker-compose.sh` | Generate `docker-compose.prod.yml`, build images |
| `04-reverse-proxy.sh` | Install Caddy, configure SSL |
| `05-finalize.sh` | Migrations, seed, health check |

### Configuration

Copy `deploy/vps-scripts/.env.template` to `deploy/vps-scripts/.env` and set:
- `ADMIN_DOMAIN`, `STOREFRONT_DOMAIN`, `API_DOMAIN` — your domain names
- `POSTGRES_PASSWORD` — database password (auto-generates JWT_SECRET)

## Restrictions

- **Do not update or modify the `packages/mobile` project.** The mobile app is managed separately and should not be touched.
