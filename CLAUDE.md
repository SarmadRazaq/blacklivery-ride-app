# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlackLivery is a multi-region ride-sharing and delivery platform. All active development is in `backend/` (Node.js + Express + TypeScript + Firebase). `frontend-adminpanel/` contains a React admin dashboard. `mobile/` contains native mobile apps.

## Commands

All commands run from the `backend/` directory.

```bash
npm run dev          # Development server with hot reload (nodemon + ts-node)
npm run build        # TypeScript compilation → dist/
npm start            # Run compiled server (dist/server.js)
npm test             # Run all Jest tests with coverage
npm run test:watch   # Jest in watch mode
```

Run a single test file:
```bash
npx jest tests/ride_status_transitions.test.ts
```

Type-check without emitting:
```bash
npx tsc --noEmit
```

Utility scripts (run from `backend/`):
```bash
npx ts-node -e "require('./src/scripts/create_admin.ts')"   # Create admin user
npm run create:rider                                          # Create test rider
```

CI runs: `npm ci` → `npx tsc --noEmit` → `npm run build` → `npm test -- --ci --coverage`

## Architecture

### Tech Stack
- **Runtime**: Node.js ≥20, Express 5, TypeScript 5 (strict mode, CommonJS output)
- **Database**: Firestore (documents), Firebase Realtime DB (live location streaming)
- **Auth**: Firebase Auth (client-side) + Firebase Admin ID token verification (backend)
- **Real-time**: Socket.IO 4 for location tracking and ride status events
- **Validation**: Zod schemas in `src/schemas/`
- **Logging**: Pino via Morgan
- **API Docs**: Swagger/OpenAPI at `/api-docs` (dev only)

### Request Lifecycle
```
Client → auth.middleware (Firebase token verify + user cache)
       → roles.middleware (RBAC)
       → validate.middleware (Zod)
       → controller
       → service(s)
       → Firestore / external APIs
```

User data is cached in-memory for 1 minute (max 10K users) to reduce Firestore reads.

### Key Service Patterns

**RideService** (`src/services/RideService.ts`) — core business logic: driver-rider geo matching (geohash-based), status machine transitions (`pending → accepted → arrived → in_progress → completed/cancelled`), and matching recovery on server restart.

**Payment** (`src/services/payment/`) — strategy pattern via `IPaymentProvider` interface. Active providers: Stripe (USA/USD), Paystack (Nigeria/NGN), Flutterwave (NGN fallback), Monnify (NGN alternative). Provider selected at runtime based on user's `region` field.

**Pricing** (`src/services/pricing/`) — strategy pattern via `IPricingStrategy`. `NigeriaPricingStrategy` and `ChicagoPricingStrategy` implement region-specific fare calculation. `SurgeService` computes multipliers using OpenWeather + demand/supply ratio. `PricingConfigService` manages admin-configurable rules.

**Socket.IO server** (`src/server.ts`) — authenticates via Firebase ID token on connection. Rooms: `admin`, `driver:{id}`, `rider:{id}`. Key events: `location_update`, `accept_ride`, `decline_ride`, `driver_status`. Active ride data cached in-memory (30s TTL).

**Multi-region** — `src/config/region.config.ts` maps region codes to currencies, SMS providers (Termii for NG, Twilio for US), and pricing strategies.

### Data Flow: New Ride Request
1. Rider calls `POST /api/v1/rides`
2. `RideService` creates Firestore document, queries nearby online drivers via geohash
3. `SocketService` emits `new_ride_request` to matched driver rooms
4. Driver responds via socket (`accept_ride`) or REST (`PATCH /api/v1/rides/:id/accept`)
5. `rideStatusTransition.middleware` validates the state change is legal
6. Status updates broadcast to both rider and driver rooms in real time

### Wallet & Ledger
`WalletService` manages rider/driver balances. All financial moves are double-entry recorded via `LedgerService`. Driver payouts use Stripe Connect (USA) or Paystack Transfer (NG).

### Auth Flow
Firebase handles client-side auth (sign-in, token refresh). Backend only verifies Firebase ID tokens — no passwords stored. Driver onboarding (`POST /auth/driver/onboarding`) triggers KYC document upload to Firebase Storage. 2FA uses OTP via SMS.

### Background Jobs
`CronSchedulerService` uses `node-cron` for: settlement processing, driver incentive evaluation (weather-based via `IncentiveService`), loyalty point accrual, and stale-ride cleanup. Disable with `DISABLE_CRON=true`.

## Key Conventions

- **Versioned API**: All routes mount under `/api/v1/`
- **Idempotency**: Payment and payout mutations support `Idempotency-Key` header (`idempotency.middleware.ts`)
- **Role enum**: `rider | driver | admin` — stored in Firestore user document, read into `req.user.role`
- **Error responses**: `{ error: string, code?: string }` shape; use HTTP semantics (400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict)
- **Schemas**: Always add/update Zod schema in `src/schemas/` and wire through `validate.middleware` for new endpoints
- **Swagger**: Add JSDoc `@swagger` annotations above route handlers — they are auto-collected
- **TypeScript**: Strict mode is on; avoid `any`, use model interfaces from `src/models/`

## Environment

Copy `backend/.env.example` to `backend/.env`. Required for local dev:
- `GCLOUD_PROJECT` + `GOOGLE_APPLICATION_CREDENTIALS` — Firebase service account JSON path
- `FIREBASE_DATABASE_URL` — Realtime DB URL
- `GOOGLE_MAPS_API_KEY` — Maps, geocoding, directions
- Payment keys for at least one provider (Stripe or Paystack)
- `OPENWEATHER_API_KEY` — Surge pricing and driver incentives

## Testing

Tests live in `backend/tests/`. Jest is configured with `ts-jest`. Test files use Firebase Admin mocked via `jest.mock`. Coverage reports output to `backend/coverage/`.

Critical test suites:
- `ride_status_transitions.test.ts` — state machine validation
- `settlement.test.ts` — financial correctness
- `security_audit.test.ts` — auth/authorization checks
- `system_integration.test.ts` — end-to-end flows

## Docker

Multi-stage Dockerfile in `backend/`. Stage 1 builds TypeScript; Stage 2 copies only `dist/` and prod dependencies into a minimal Alpine image. Runs as non-root user `appuser` (UID 1001). Health check polls `GET /health` (tests Firestore connectivity).
