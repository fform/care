# Care — Architecture Reference

> This document is the canonical reference for future coding agents and contributors.
> Keep it up to date when making structural changes.

---

## Product Overview

Care is a caregiving coordination platform that makes the invisible labor of caregiving visible, shared, and manageable. It supports aging parent care, child management, pet care, and recovery coordination.

**Core vocabulary:**
| Term | Meaning |
|------|---------|
| **Circle** | A group of people organized around caring for someone or something |
| **Heart** | The person/pet at the center of a circle (not "patient" or "dependent") |
| **Member** | Anyone in a circle (caregiver, supporter, care recipient, professional) |
| **Anchor** | The primary caregiver — holds things together |
| **Plan** | A structured set of care goals within a circle |
| **Concern** | A time-sensitive item that surfaces to the top |
| **Task** | A single action item |
| **Update** | A completed action + notes (human-friendly "log entry") |
| **Today** | The home screen — the Daily Brief |
| **Digest** | AI-generated summary (weekly or on-demand) |

**Member roles:** `organizer` | `caregiver` | `supporter` | `care_recipient` | `professional`

---

## Repository Structure

```
care/                          Monorepo root (Turborepo + pnpm workspaces)
├── app/                       Expo app — iOS, Android, (eventually) web
├── web/                       Next.js marketing site (domain.com)
├── api/                       Express.js API — deployed on Railway
├── shared/                    Shared types, design system, UI components
├── turbo.json                 Turborepo pipeline config
├── pnpm-workspace.yaml        pnpm workspace definition
└── ARCHITECTURE.md            This file
```

---

## Package: `shared` (`@care/shared`)

**Purpose:** Single source of truth for types, design tokens, and reusable React Native UI components. Everything here can be imported by `app/` and (for types/tokens) by `web/`.

```
shared/src/
├── theme/
│   ├── colors.ts        Palette + semantic color tokens
│   ├── typography.ts    Font families, sizes, pre-composed text styles
│   ├── spacing.ts       4px-base spacing scale, border radius, shadows
│   └── index.ts
├── types/
│   ├── user.ts          User, CircleMember, UserRole, AuthProvider
│   ├── circle.ts        Circle, Plan, Concern
│   ├── task.ts          Task, TaskStatus
│   ├── api.ts           ApiResponse, ApiError, PaginatedResponse
│   └── index.ts
└── components/
    └── ui/
        ├── Text.tsx     Variant-based text (maps to textStyles tokens)
        ├── Card.tsx     Surface card with optional moti spring animation
        ├── Button.tsx   primary | secondary | ghost | danger, spring press
        ├── Input.tsx    Animated focus border, error/hint states
        └── index.ts
```

**Key decisions:**
- Components are React Native (work in Expo native + Expo web). They are NOT DOM components and cannot be used directly in the Next.js marketing site.
- `web/` uses Radix UI Themes for its own components; it imports only types and theme tokens from `@care/shared`.
- To add a new component: create it in `shared/src/components/ui/`, export from `shared/src/components/index.ts`.

**Design system:**
- Background: `#F5F0E8` (warm cream)
- Primary CTA: `#F59E0B` (amber)
- Secondary/active: `#6B8F71` (sage green)
- Typography: Open Sans (embedded). **When the final typeface arrives, update only `shared/src/theme/typography.ts` — the `fontFamily` object.**
- Animations: `moti` + `react-native-reanimated`. Prefer spring transitions. Things move in/out; avoid bare fade. Use `from/animate` on `MotiView`.
- Icons: `phosphor-react-native` only. No emoji, no other icon libraries.

---

## Package: `app` (`@care/app`)

**Purpose:** Expo app targeting iOS and Android. Uses Expo Router for file-based navigation.

**Key libraries:**
| Library | Purpose |
|---------|---------|
| `expo` ~52 | Build toolchain |
| `expo-router` ~4 | File-based navigation (React Navigation under the hood) |
| `expo-auth-session` | OAuth PKCE flow for social login |
| `expo-secure-store` | JWT token storage (hardware-backed on device) |
| `expo-font` + `@expo-google-fonts/open-sans` | Embedded Open Sans |
| `react-native-onesignal` | Push notifications |
| `zustand` ^5 | Global state management |
| `moti` + `react-native-reanimated` | Animations |
| `phosphor-react-native` | Icons |

**File structure:**
```
app/
├── app.config.ts              Expo config (reads env vars injected by op run)
├── eas.json                   EAS Build + Submit config
├── app/                       Expo Router routes
│   ├── _layout.tsx            Root layout: font loading, auth init, splash
│   ├── index.tsx              Root redirect (auth → tabs)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx          Email + Google + Apple login/register
│   └── (tabs)/
│       ├── _layout.tsx        Tab bar (House, CirclesThree, CheckSquare, User)
│       ├── index.tsx          Today — Daily Brief
│       ├── circles.tsx        Circles list
│       ├── tasks.tsx          Tasks & Concerns
│       └── profile.tsx        User profile + logout
└── src/
    ├── lib/
    │   ├── api.ts             Typed fetch wrapper, token management
    │   └── auth.ts            OAuth flow helpers (expo-auth-session)
    └── store/
        ├── auth.store.ts      Zustand: user session, login/logout actions
        └── circles.store.ts   Zustand: circles, tasks, concerns
```

**Auth flow:**

Google:
1. `signInWithGoogle()` runs PKCE via `expo-auth-session`
2. Auth code + redirectUri → `POST /auth/oauth { provider: 'google', code, redirectUri }`
3. API exchanges code with Google, verifies id_token, finds/creates user + OAuthAccount row

Apple (native iOS — different from web OAuth):
1. `signInWithApple()` invokes the native iOS Sign in with Apple sheet via `expo-apple-authentication`
2. Device returns a signed `identityToken` JWT (no p8 key needed on client)
3. `POST /auth/oauth { provider: 'apple', identityToken, fullName }` sent to API
4. API verifies identityToken against Apple's JWKS public keys
5. Store `fullName` on first sign-in — Apple only sends it once

Both flows:
- JWT stored in `expo-secure-store` via `api.ts`
- If email matches existing account with a different provider → API returns `{ code: 'USE_PROVIDER', provider: '...' }` → client shows "you signed up with [provider]"

**Apple credentials in 1Password:**
| Secret | Path | Used by |
|--------|------|---------|
| .p8 auth key | `op://care/apple/auth_key` | API (web OAuth client_secret generation) |
| Team ID | `op://care/apple/team_id` | API + EAS submit |
| App/Bundle ID | `op://care/apple/app_id` | app.config.ts + EAS submit |
| Key ID (for .p8 + App Store Connect) | `op://care/apple/app_store_connect_id` | API (p8 key identifier) + EAS |
| App Store Connect .p8 key | `op://care/apple/app_store_connect_key` | API (Sign in with Apple server-side) + EAS |

**State management:**
- Zustand stores live in `src/store/`. Each store calls the API client (`src/lib/api.ts`).
- Stores are not persisted to disk (secure store holds only the JWT). On app launch, `authStore.initialize()` calls `GET /auth/me` to restore session.
- Add new stores as features grow; keep stores domain-scoped.

**Builds & Updates:**
- `eas build --profile production` → production build (iOS App Store / Google Play)
- `eas build --profile preview` → internal distribution build
- `eas update` → OTA update push (channel matches build profile)
- Expo project ID: `op://care/expo/id` (injected at build time)

---

## Package: `api` (`@care/api`)

**Purpose:** Express 5 REST API, deployed on Railway. Handles auth, all data, and business logic.

**Key libraries:**
| Library | Purpose |
|---------|---------|
| `express` ^5 | HTTP server |
| `prisma` + `@prisma/client` | PostgreSQL ORM |
| `better-auth` | Multi-provider OAuth + account linking |
| `jose` | JWT signing/verification |
| `zod` | Request validation |
| `helmet` | Security headers |

**File structure:**
```
api/
├── prisma/
│   └── schema.prisma          Database schema (PostgreSQL)
├── src/
│   ├── index.ts               Express app setup, route mounting
│   ├── middleware/
│   │   ├── auth.ts            JWT verification, injects userId on request
│   │   └── error.ts          Global error handler
│   └── routes/
│       ├── auth.ts            POST /auth/register, /login, /oauth, GET /me
│       ├── circles.ts         GET/POST /circles, /circles/:id/tasks, /concerns
│       └── tasks.ts           PATCH /tasks/:id/complete
├── railway.toml               Railway deployment config
└── tsconfig.json
```

**Database (Prisma + PostgreSQL):**
- Models: `User`, `OAuthAccount`, `Circle`, `CircleMember`, `Plan`, `Concern`, `Task`
- `OAuthAccount` has a unique constraint on `(provider, userId)` — enforces one account per provider per user, enabling provider linking detection
- Run migrations: `pnpm --filter @care/api db:migrate:dev`
- DATABASE_URL injected from 1Password: `op://care/database/url`

**Deployment:** Defined in `api/railway.toml` (Railway config-as-code). Build runs the workspace filter for `@care/api`; migrations run as `preDeployCommand`; runtime starts `node dist/index.js` via the package `start` script. Health check: `GET /health`.

---

## Package: `web` (`@care/web`)

**Purpose:** Next.js 15 marketing site at `domain.com`. App lives at `app.domain.com` (Expo web build).

**Key libraries:** Next.js 15, Radix UI Themes (`@radix-ui/themes`), Tailwind CSS (add as needed)

**Radix UI config:** `accentColor="amber"`, `grayColor="sand"`, `radius="large"` — matches app design language.

**File structure:**
```
web/
├── app/
│   ├── layout.tsx    Root layout with Radix Theme provider
│   ├── globals.css   CSS variables for background, font
│   └── page.tsx      Marketing homepage
└── railway.toml      Railway deployment config
```

---

## Infrastructure

### Secrets (1Password)

All secrets live in the `care` 1Password vault. Never commit secrets.

| Secret | 1Password path |
|--------|---------------|
| Railway project ID | `op://care/railway/project_id` |
| Railway token | `op://care/railway/token_prod` |
| Expo project ID | `op://care/expo/id` |
| OneSignal app ID | `op://care/onesignal/app_id` |
| JWT secret | `op://care/api/jwt_secret` |
| Database URL | `op://care/database/url` |
| Google OAuth client ID | `op://care/google-oauth/client_id` |
| Google OAuth client secret | `op://care/google-oauth/client_secret` |
| Apple OAuth client ID | `op://care/apple-oauth/client_id` |
| Apple OAuth client secret | `op://care/apple-oauth/client_secret` |

**Local dev:** Copy `.env.example` to `.env`, fill `SERVICE_ACCOUNT_KEY`, then prefix commands with:
```bash
op run --env-file=.env -- pnpm dev
```

### Railway

**Services** (one Railway project, one environment: production)
| Service | Railway root dir | Domain |
|---------|-----------------|--------|
| `api` | `/` (repo root) | `api.yourdomain.com` |
| `web` | `/` (repo root) | `yourdomain.com`, `www.yourdomain.com` |
| `database` | — (Railway plugin) | internal Railway URL only |

**Config as code:** `api/railway.toml` and `web/railway.toml` are the **only** source for builder, `buildCommand`, `startCommand`, `watchPatterns`, health checks, and restart policy. Dashboard values for those fields are overridden by the files ([Railway docs](https://docs.railway.com/reference/config-as-code)).

**Root `package.json` `start` + `scripts/railway-root-start.mjs`:** Railpack only validates the **repository root** and requires a `start` script ([Railpack Node](https://railpack.com/languages/node)). There is a single root `start`; at **runtime** it branches on Railway’s `RAILWAY_SERVICE_NAME` (or optional `CARE_SERVICE=api|web`) so the **api** and **web** services each run the correct workspace package. Name services `api` and `web` in Railway, or set `CARE_SERVICE` per service. Both `api/railway.toml` and `web/railway.toml` use `deploy.startCommand = "pnpm start"` so deploy behavior matches this one entrypoint.

**Monorepo checkout:** Both services use the **repository root** as the working directory (not `api/` or `web/` alone) so `pnpm` workspaces and `shared/` resolve. Railway still needs to know **which** `railway.toml` applies to each service: in service settings, set the **config file path** to `api/railway.toml` or `web/railway.toml` respectively (see [Config as code](https://docs.railway.com/reference/config-as-code)). That one path pointer per service is structural, not duplicate command strings.

**Deploys are manual** (intentional, not auto-deploy on push):
```bash
op run --env-file=.env -- pnpm ship        # deploy both
op run --env-file=.env -- pnpm ship:api    # api only
op run --env-file=.env -- pnpm ship:web    # web only
```

**First-time Railway setup:**
1. `railway login`
2. `railway link` (link to your project ID from `op://care/railway/project_id`)
3. Create `api` and `web` services in Railway dashboard
4. Set root directory to `/` for both services
5. Set config path to `api/railway.toml` and `web/railway.toml` respectively
6. Add PostgreSQL plugin — Railway injects `DATABASE_URL` automatically into `api` service
7. Add all env vars from `.env.example` to each service in Railway dashboard
8. Configure custom domains per service

### Expo / EAS

- EAS Build profiles: `development` (dev client), `preview` (internal), `production` (stores)
- OTA updates via `eas update` — channel must match build profile
- Project ID from `op://care/expo/id`

---

## Development

```bash
# Prerequisites: Node 20+, pnpm 9+, 1Password CLI

# Install dependencies
pnpm install

# Run everything locally (with secrets injected)
op run --env-file=.env -- pnpm dev

# Run individual packages
pnpm --filter @care/app dev       # Expo (opens Expo Go / simulator)
pnpm --filter @care/api dev       # Express API on :3001
pnpm --filter @care/web dev       # Next.js on :3000

# Database
pnpm --filter @care/api db:migrate:dev   # Run migrations
pnpm --filter @care/api db:studio        # Open Prisma Studio
```

---

## What's Stubbed / TODO

The following are scaffolded but need real implementation:

- `api/src/routes/auth.ts` — Prisma user lookup, password hashing (bcrypt), better-auth OAuth exchange
- `api/src/routes/circles.ts` — Prisma queries for all circle/plan/concern/task endpoints
- `app/app.config.ts` — `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` need to be added to 1Password and wired into the build
- `app/app/(tabs)/` screens — real data from Zustand stores (scaffolded, data binding pending)
- Push notifications — OneSignal initialized in app root, server-side send logic in API
- AI features (intake, digest, suggestions) — v2
- EAS submit config — Apple Team ID, ASC App ID, Android service account
