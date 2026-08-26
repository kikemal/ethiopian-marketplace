# SuqET — Ethiopian Second-Hand Marketplace

**Phase 4 final submission** · Organizer: Seblewongel · Deadline: **26 August 2026**

SuqET is a full-stack marketplace for buying and selling used goods in Ethiopia. Buyers discover listings, message sellers in real time, and check out through **Chapa TEST**. Sellers list items and submit private KYC. Admins review verification photos that never appear on public listings.

This README is for **hackathon judges**: what the product is, what the demo proves, how to run it in minutes, and what is intentionally not live production.

| Submission item | Link |
|-----------------|------|
| GitHub repo | https://github.com/kikemal/ethiopian-marketplace |
| Hosted demo | https://ethiopian-marketplace-opal.vercel.app |
| API (Render) | https://suqet-api.onrender.com (`GET /api/health`) |
| Video walkthrough | _add video URL before submission_ |

---

## What SuqET is

**Problem.** Informal second-hand trade in Ethiopia leans on social media and private chats. Discovery is noisy, payment trust is thin, and seller identity is hard to verify without posting IDs in public threads.

**Solution.** SuqET gives buyers and sellers one shared surface:

- Searchable listings with photos and ETB prices
- In-app chat scoped to a listing
- TEST-mode payment checkout with order status in the app
- Admin-reviewed KYC stored privately (not on listing pages)

**What the demo proves**

- End-to-end buyer → chat → checkout → order status
- Seller listing + private KYC upload + admin review
- Secrets stay on the API — never in the Next.js app

**What this is not**

- **Not live escrow.** “Released” / “refunded” update **our database**. They do not automatically pay the seller or reverse a real bank transfer.
- **Chapa is TEST mode** with a real `CHASECK_TEST-…` key. If the key still contains the `xxx` placeholder, Buy Now uses an **in-app mock** checkout — not a bank transfer.
- Email is optional locally (API returns reset/verify links when mail is unset). On Render use **Resend** (`RESEND_API_KEY`) — outbound SMTP is often blocked.

---

## Architecture

Two codebases. Clear boundary.

| Folder | Role |
|--------|------|
| `web/` | Next.js 14 App Router + Tailwind. **No secret keys** — only `NEXT_PUBLIC_API_URL`. |
| `backend/` | Express + TypeScript + Prisma + PostgreSQL + JWT + Socket.io + Chapa + Cloudinary. **All secrets live in `backend/.env` only.** |

**Stack:** Node.js · Express · Prisma/PostgreSQL · Next.js 14 · Socket.io · Chapa (TEST) · Cloudinary (optional) · JWT via httpOnly cookie

Every JSON API response:

```json
{ "success": true, "data": {}, "message": "..." }
```

Errors may include `error`. Auth uses httpOnly cookie `etm_sid` (Bearer token still accepted).

```
Browser (web/) ──REST + cookies──► Express API (backend/)
                 Socket.io chat
API ──Prisma──► PostgreSQL
API ──optional──► Cloudinary · Chapa TEST
```

---

## User flows

### Buyer — browse → chat → buy → hold/release

1. Browse and search listings (category, text, location).
2. Open a listing → message the seller (Socket.io inbox).
3. **Buy Now** → Chapa TEST hosted checkout (or mock if the key still has `xxx`).
4. Return to `/payments/return` → sync verifies the tx → order shows **held**.
5. Seller **Confirm delivery** → status **released** in our DB. Buyer may **Request refund** while held (DB flag; TEST refund may be attempted — not a live bank recall).

### Seller — list + dashboard

1. Create listings with photos, ETB price, location.
2. **Dashboard** for own items and sales.
3. **Orders** — confirm delivery on held payments.
4. **Verify** — upload ID + face photos for KYC.

### Admin — KYC + reports

1. Review pending KYC (photos load only for the admin session).
2. Approve or reject sellers.
3. Review listing reports on the same admin surface.

---

## Cloudinary

| Use | Behavior |
|-----|----------|
| Listing images | Public upload to Cloudinary when configured. Without Cloudinary, files are stored under `backend/uploads/` as **relative** `/uploads/...` paths and served from `BACKEND_PUBLIC_URL`. |
| KYC documents | **Private** storage — Cloudinary `type: 'private'` when configured, else disk under `backend/private/kyc`. Served only through authenticated admin/KYC routes — never as public listing URLs. |

**Why teammates saw blank images:** older local uploads were saved as `http://localhost:4000/uploads/...`. That only works on the machine that owns the file. The API now rewrites those URLs, and the web app resolves media via `NEXT_PUBLIC_API_URL`.

On Render, **Cloudinary is required** for durable listing photos (ephemeral disk). Set `CLOUDINARY_*` on the API; never put those secrets in `web/`.

Collaborators should either:
1. Use the hosted demo (Vercel + Render), or
2. Point `NEXT_PUBLIC_API_URL` / `BACKEND_PUBLIC_URL` at the shared Render API and configure Cloudinary — do not share a teammate’s `localhost` upload URLs.

---

## Auth

- **Email / password** — register, login, logout; optional forgot/reset and email verify when Resend or SMTP is configured.
- **Google OAuth** (optional) — after Google redirects, the frontend exchanges a **one-time code** via `POST /api/auth/oauth/exchange`. The session JWT is **not** left in the URL.
- **Session** — httpOnly cookie `etm_sid`. In production (`NODE_ENV=production`), cookie is `Secure` + `SameSite=None` so login works across **Vercel (web) → Render (API)** with `credentials: 'include'`.

Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` on the **API** (Render / `backend/.env`) for Google sign-in. The login/register **Continue with Google** button is shown only when `GET /api/auth/providers` returns `{ data: { google: true } }` — there is no `NEXT_PUBLIC_*` Google client id on Vercel.

---

## Google Translate

Navbar language control (Google Translate Element) for:

- **English** (`en`)
- **Amharic** (`am`)
- **Afaan Oromo** (`om`)
- **Tigrinya** (`ti`)

No special deploy config. Assists reading the UI; it is not a full i18n string catalog.

---

## Chapa payments (honest)

| Mode | When |
|------|------|
| **TEST checkout** | `CHAPA_SECRET_KEY` is a real dashboard Test key (`CHASECK_TEST-…`). |
| **Mock checkout** | Key still contains the `xxx` placeholder — in-app mock only. |

- Webhooks: HMAC-verified (`CHAPA_WEBHOOK_SECRET`); dashboard URL → `POST /api/payments/verify`.
- **localhost cannot receive Chapa webhooks.** After paying, the app returns to `/payments/return` and calls `POST /api/payments/sync` to verify.
- Order statuses `held` / `released` / `refunded` are **app DB state**, not full live escrow or automatic seller payout.
- Chapa test phones ([docs](https://developer.chapa.co/docs)): `0900123456`, OTP `12345`.
- `cd backend && npm test` runs webhook-signature unit tests.

---

## KYC

1. Seller uploads ID + face photos at **Verify**.
2. Files stay private (disk or Cloudinary private).
3. Admin opens **Admin**, reviews photos in-session, approves or rejects.
4. KYC images are **not** public listing assets.

---

## Other strengths

- **Realtime chat & inbox** — Socket.io, listing-scoped threads, notifications.
- **Mobile-first** — layouts aimed at 375px width.
- **Rate limits** — auth, payments, and write routes (`express-rate-limit`; `TRUST_PROXY` behind Render).
- **Health** — `GET` and `POST /api/health` → `{ "success": true, ... }`.
- **Split deploy** — Render Blueprint: Postgres (`suqet-db`) + API (`suqet-api`) only. Next.js on **Vercel**. Secrets only on the API.

---

## Setup

Requirements: **Node.js 18.17+**, **npm**, **Docker** (Postgres). Copy example env files. Never commit `.env` files.

### Demo accounts (after seed)

Password for every seeded account: `Password123!`

| Role | Email | Password |
|------|-------|----------|
| Buyer | sara@buyer.et | Password123! |
| Seller | abebe@seller.et | Password123! |
| Admin | admin@marketplace.et | Password123! |

Also seeded: `tigist@seller.et`, `dawit@seller.et`, `yonas@buyer.et`, `hanna@buyer.et` (same password).

`npm run seed` **deletes existing marketplace rows** and recreates demo data. It refuses to run when `NODE_ENV=production` unless `FORCE_SEED=true`.

### 1. Postgres

```bash
docker compose up -d
```

### 2. Backend — http://localhost:4000

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Edit `backend/.env` as needed. For real Chapa TEST checkout, set `CHAPA_SECRET_KEY` to a dashboard **Test** key (`CHASECK_TEST-…`). Leave the `xxx` placeholder only if you want mock checkout.

Health check: `GET` or `POST /api/health`.

### 3. Frontend — http://localhost:3000

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

`web/.env.local` needs only:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Usage — five-minute judge path

Open http://localhost:3000 → log in as Sara → open a listing → chat → Buy Now → return to Orders. Use a second browser (or private window) for Abebe or Admin in parallel.

### Buyer (Sara)

1. Log in: `sara@buyer.et` / `Password123!`
2. **Browse** — open a listing (e.g. Samsung Galaxy A14)
3. Message the seller from the listing or **Inbox**
4. **Buy Now** — Chapa TEST checkout, or mock page if the key still has `xxx`
5. After pay → `/payments/return` → **Orders** (status **held** when sync succeeds)

### Seller (Abebe)

1. Log in: `abebe@seller.et` / `Password123!`
2. **Sell** — create a listing
3. **Dashboard** — listings and sales
4. **Orders** — **Confirm delivery** on a **held** payment → **released** in our DB only
5. **Verify** (`/verify`) — upload ID + face photos (private)

### Admin

1. Log in: `admin@marketplace.et` / `Password123!`
2. **Admin** — approve/reject KYC; review listing reports

---

## Deploy (Render API + Vercel frontend)

Split hosting:

| Where | What |
|-------|------|
| **Render** | PostgreSQL (`suqet-db`) + Express API (`suqet-api`) |
| **Vercel** | Next.js 14 App Router (`web/`) |

`render.yaml` Blueprint deploys **Postgres + API only** — no Next.js service on Render.

### 1. Render — Postgres + API

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect this repo → `render.yaml` on `main`.
2. Wait for `suqet-db` + `suqet-api`. Health: `GET https://<api-host>/api/health`.
3. Set API env vars (see checklist below). After you have the Vercel URL, set `FRONTEND_URL` to that origin (no trailing slash) and redeploy the API.

**API** — build: `npm install --include=dev && npm run build` · start: `npx prisma migrate deploy && node dist/server.js` · health: `/api/health`

**Manual alternative:** create a Postgres instance and a Node Web Service with `rootDir: backend`, same build/start commands, and the env vars below.

#### Render (`suqet-api`) env vars

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | From Blueprint / Postgres |
| `NODE_ENV` | yes | `production` |
| `TRUST_PROXY` | yes | `true` on Render |
| `JWT_SECRET` | yes | Blueprint can generate |
| `JWT_EXPIRES_IN` | yes | e.g. `7d` |
| `FRONTEND_URL` | yes | Vercel origin, e.g. `https://your-app.vercel.app` — **no trailing slash**. Used for CORS, Socket.io, redirects. |
| `CORS_ORIGINS` | optional | Comma-separated extra origins (Vercel preview URLs). |
| `BACKEND_PUBLIC_URL` | yes | Public API origin, e.g. `https://suqet-api.onrender.com` — no trailing slash |
| `CHAPA_SECRET_KEY` | for TEST pay | Real `CHASECK_TEST-…` (not `xxx` placeholder) |
| `CHAPA_WEBHOOK_SECRET` | for webhooks | Dashboard webhook secret |
| `CHAPA_CALLBACK_URL` | for Chapa | e.g. `https://suqet-api.onrender.com/api/payments/callback` |
| Cloudinary | optional | Same names as `backend/.env.example` |
| `RESEND_API_KEY` | for email on Render | From [resend.com/api-keys](https://resend.com/api-keys). Prefer over SMTP (SMTP often blocked). |
| `EMAIL_FROM` | with Resend | Verified-domain address, e.g. `SuqET <noreply@yourdomain.com>`. Not `*.vercel.app`. Test: `SuqET <onboarding@resend.dev>`. |
| SMTP_* | local/dev only | Optional fallback when `RESEND_API_KEY` is unset. |
| `GOOGLE_CLIENT_ID` | for Google | Web client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | for Google | Web client secret (API only — never in `web/`) |
| `GOOGLE_CALLBACK_URL` | for Google | Must match Console redirect URI exactly, e.g. `https://suqet-api.onrender.com/api/auth/google/callback` |

Chapa Test webhook URL in the dashboard:

```
https://<suqet-api-host>/api/payments/verify
```

Callback URL must match `CHAPA_CALLBACK_URL`.

### 2. Vercel — Next.js (`web/`)

1. [Vercel](https://vercel.com) → Import the GitHub repo.
2. Set **Root Directory** to `web` (or import only `web/` if you prefer).
3. Framework preset: Next.js. Build/output defaults are fine.
4. Set env (Production):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Public Render API URL, e.g. `https://suqet-api.onrender.com` — **no trailing slash** (must match how the client concatenates paths) |

`NEXT_PUBLIC_*` is inlined at **build** time — redeploy after changing it. Do **not** put Chapa, Cloudinary, JWT, Google client secret, or DB secrets in Vercel / `web/`.

5. Deploy. Paste the production URL into the **Hosted demo** row at the top of this README.

### 3. Google OAuth (Vercel + Render + Google Cloud Console)

The UI does **not** use a public Google client id. Flow: browser → Render `GET /api/auth/google` → Google → Render `GET /api/auth/google/callback` → redirect to Vercel `/auth/oauth` → `POST /api/auth/oauth/exchange`.

**Why the button is missing after deploy:** `GoogleSignInButton` calls `GET {NEXT_PUBLIC_API_URL}/api/auth/providers` and renders only if `data.google === true`. That flag is true only when **all three** Google env vars are set on Render. If the fetch fails (wrong `NEXT_PUBLIC_API_URL`, or CORS because `FRONTEND_URL` ≠ your Vercel origin), the button stays hidden even when Google is configured.

| Where | What to set |
|-------|-------------|
| **Render** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://suqet-api.onrender.com/api/auth/google/callback` (no trailing slash on host; path exact). Also `FRONTEND_URL` = your Vercel origin. Redeploy/restart API after changes. |
| **Vercel** | Only `NEXT_PUBLIC_API_URL=https://suqet-api.onrender.com`. **No** `NEXT_PUBLIC_GOOGLE_*`. Redeploy after changing it. |
| **Google Cloud Console** | APIs & Services → Credentials → OAuth 2.0 **Web** client |

**Google Cloud Console URIs** (must match production exactly):

| Field | Value |
|-------|--------|
| Authorized JavaScript origins | Your Vercel origin, e.g. `https://ethiopian-marketplace-opal.vercel.app` (and `http://localhost:3000` for local). Optional: API origin is not required for this server-side redirect flow. |
| Authorized redirect URIs | `https://suqet-api.onrender.com/api/auth/google/callback` (must equal `GOOGLE_CALLBACK_URL`) |

**Quick check:** open `https://suqet-api.onrender.com/api/auth/providers` — expect `"google": true`. On the Vercel login page, DevTools → Network: providers request must succeed (not blocked by CORS).

### 4. Cross-origin (cookies + CORS)

The browser calls the Render API from the Vercel origin with `credentials: 'include'`. Session cookie is `etm_sid`.

| Setting | Why |
|---------|-----|
| API `FRONTEND_URL` = Vercel production origin | CORS + Socket.io allowlist (`credentials: true`) |
| Optional `CORS_ORIGINS` | Extra preview hosts if judges use them |
| `NODE_ENV=production` | Cookie `Secure; SameSite=None` (required for cross-site cookie) |
| `TRUST_PROXY=true` | Correct client IP / Secure cookie behind Render |

After the first Vercel deploy: copy the Vercel URL → set Render `FRONTEND_URL` → restart/redeploy API → confirm login still sets `etm_sid` and chat connects.

### 5. Smoke-test

1. `GET https://<api>/api/health`
2. `GET https://<api>/api/auth/providers` → `"google": true` if OAuth env is set
3. Open the Vercel site → log in (Sara or Google) → browse → chat → Buy Now
4. Confirm order status after return / sync

Honest limits still apply: **Chapa TEST**, escrow is **DB-only** (`held` / `released` / `refunded`), use **Resend** for mail on Render (SMTP often blocked).

Do **not** commit `.env` / `.env.local`.

Local Docker Compose remains the supported path for judges who prefer to run the stack themselves (see **Setup**).
