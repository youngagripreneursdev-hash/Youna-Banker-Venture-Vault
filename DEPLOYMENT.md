# YOUNA Venture Vault — Deployment Guide

## What this is
React 19 + TypeScript + Vite 7 + Tailwind + shadcn/ui + Zustand (persist) with optional Supabase backend sync. Ships prebuilt in `dist/` — deploy the source and build, or deploy `dist/` directly.

## 1. Deploy to Vercel (recommended — `vercel.json` included)
```bash
npm ci
npm run build        # outputs dist/
```
- Framework preset: **Vite** · Build command: `npm run build` · Output dir: `dist`
- SPA fallback is preconfigured in `vercel.json`.
- Set the environment variables from `.env` in the Vercel project settings (all `VITE_*` keys).

## 2. Environment variables
| Variable | Required | Notes |
|---|---|---|
| `VITE_ADMIN_PASSWORD_HASH` | **Yes** | SHA-256(admin password + `yavv-salt-2026`). The banker gate checks the hash only — the plaintext no longer ships in the bundle. |
| `VITE_ADMIN_PASSWORD` | Legacy | Kept quoted (`"YAVV202614Feb24!@#"`) as a fallback. **Delete it** once you confirm hash login works. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional | If set, the app read-syncs and write-mirrors to Supabase. If unreachable, the app runs local-first and seeds demo data. |
| `VITE_ENABLE_DEMO_SEED` | Optional | `true` (default): seeds 2 students + 3 businesses + R50,000 reserve when the store is empty. Set `false` for a clean production start. |
| `VITE_MONTHLY_INTEREST_RATE_PERCENT` | Optional | Default `2` (%/month). |
| `VITE_INTEREST_BALANCE_THRESHOLD` | Optional | Millicents (1 Rand = 1,000 mc). Default in `.env`. |
| `VITE_INTEREST_PERIOD_HOURS` | Optional | Default `720` (30 days). |
| `VITE_EMAILJS_SERVICE_ID / _TEMPLATE_ID_RESET / _PUBLIC_KEY` | Optional | Password-reset emails via EmailJS. Without them the reset code is shown on-screen (demo mode). |

> **SECURITY:** `.env` contains `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET`. Vite does NOT inline non-`VITE_` vars into the bundle, but these secrets should NOT live in the frontend repo — move them to a server-side store and rotate them if this repo was ever shared.

## 3. Supabase (optional backend)
Run the SQL in this order in the Supabase SQL editor:
1. `supabase/schema-idempotent.sql`
2. `supabase/migration-2026-07-17-fixes.sql` (adds `account_expiry_date`, amount CHECKs, balance guards, backer-rule trigger, snapshot insert policy)

## 4. Accounts after first boot (demo seed on)
| Role | Email | Password |
|---|---|---|
| Banker | `youngagripreneurs.ng@gmail.com` | the admin password, then the same password at the Restricted Access gate |
| Demo student | `thandi@demo.youna` | `DemoPass123` |

## 5. Verified flows (E2E 27/27)
Signup (with optional student-card upload) · hash login · home/market/analytics · Funding tab & backing (auto go-live at 10 backers) · owner loan application · banker business review · reserve-backed loan approval (double-entry journal) · deposit/withdrawal approval · vault reserve top-up · password reset (EmailJS or demo box) · session persistence · deep links (`/business/:id` refresh-safe).
