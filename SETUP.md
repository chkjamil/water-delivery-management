# AquaFlow — Setup Guide

## 1. Install Dependencies

```bash
cd aquaflow
npm install
```

## 2. Create Supabase Project (Free)

1. Go to https://supabase.com and sign up (free)
2. Click **New Project** → fill name "aquaflow" → set a strong DB password → choose a region
3. Wait ~2 minutes for it to provision

## 3. Run the Database Schema

The schema is split across numbered migration files in `supabase/migrations/` — there is no Supabase CLI migration runner in this project, so each file is applied by hand, **in order**, from `001` through the highest number in the folder (28 files as of this writing).

1. In Supabase Dashboard → **SQL Editor** → click **New query**
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql` → click **Run** → confirm "Success"
3. Repeat for every subsequent file in numeric order (`002_...sql`, `003_...sql`, … up to the last one) — **one file per query, never combine files into one paste.** A few files (e.g. `019_add_delivery_person_role.sql`) add a new enum value and must run as their own script for that reason.
4. If you're setting up a fresh project, just run all of them once, in order. If you're updating an existing project, only run the migration files that are newer than the last one you already applied.

## 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` — fill in your Supabase values from:
**Supabase Dashboard → Project Settings → API**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## 5. Create Your Super Admin Account

1. Run the app: `npm run dev`
2. Go to http://localhost:3000/register
3. Create your account
4. In Supabase Dashboard → **Table Editor → profiles** → find your row
5. Change `role` column from `customer` to `super_admin`
6. Log in again — you now have full access

## 6. Generate PWA Icons

**Option A (easiest):** Use https://maskable.app/editor
- Paste this SVG and export all sizes to `public/icons/`

**Option B:** Install canvas and run the script:
```bash
npm install canvas
node scripts/generate-icons.js
```

## 7. Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import at https://vercel.com/new

**Add environment variables** in Vercel Dashboard → Project → Settings → Environment Variables
(same 3 keys from step 4)

## Project Structure

```
aquaflow/
├── app/
│   ├── (auth)/           # login, register, forgot-password
│   └── (dashboard)/      # all protected pages
│       └── dashboard/    # role-aware home page
├── components/
│   └── layout/           # Sidebar, Header
├── lib/
│   ├── supabase/         # client.ts, server.ts
│   └── permissions.ts    # RBAC helper
├── supabase/
│   └── migrations/       # SQL schema — run in Supabase
├── types/                # TypeScript types
├── public/
│   ├── manifest.json     # PWA manifest
│   └── icons/            # PWA icons (generate with script)
└── middleware.ts          # Auth + role-based routing
```

## What's Built (Phase 1)

- [x] Full TypeScript types for all entities
- [x] Supabase database schema with RLS, triggers, auto-calculations
- [x] Authentication: login, register, forgot password
- [x] Role-based middleware (routes protected by role)
- [x] Dashboard layout: responsive sidebar + header
- [x] Role-aware dashboards: Admin/Super Admin, Staff, Delivery Person, Customer
- [x] RBAC permissions helper (40+ permissions)
- [x] PWA manifest + service worker config
- [x] Mobile-first CSS design system

## Phase 2 — Core Operations

- [x] Inventory management CRUD
- [x] POS interface
- [x] Customer order placement (with date/time picker)
- [x] Delivery management board
- [x] Reports & charts
- [x] Settings pages

## Phase 3 — Recurring Delivery Scheduling

- [x] `delivery_person` role — a narrower-permission driver alongside `staff` (both remain assignable as drivers everywhere)
- [x] Admin-managed customer delivery preferences: payment method (cash / monthly account), recurring frequency (weekly, biweekly, or monthly, up to 2 days), and a "standing order" of default items
- [x] Admin-side address management (add/edit/delete on a customer's behalf), with a delivery zone per address
- [x] Monthly-scoped weekly zone → driver schedule (`/schedule`) with per-date overrides, whole-week bulk-assign, and automatic carry-forward into a new month
- [x] Daily materialized delivery stops (`/my-stops`) generated from the recurring schedule — mark delivered (auto-creates the order, applies payment logic, emails the customer) or skipped (notifies admins)
- [x] Customer credit ledger — accrual/payment history behind the running balance, with an admin settle-payment action
- [x] Live 7-day upcoming-deliveries preview (`/upcoming-deliveries`)
- [x] Customer-facing dashboard showing their schedule, address, payment status, unpaid balance, and bottle ledger

See `AquaFlow_User_Manual.md` for the full feature walkthrough by role.
