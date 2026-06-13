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

1. In Supabase Dashboard → **SQL Editor** → click **New query**
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run** — you should see "Success"

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
- [x] Role-aware dashboards: Admin/Super Admin, Staff, Customer
- [x] RBAC permissions helper (40+ permissions)
- [x] PWA manifest + service worker config
- [x] Mobile-first CSS design system

## Next Phases

- [ ] Inventory management CRUD
- [ ] POS interface
- [ ] Customer order placement (with date/time picker)
- [ ] Delivery management board
- [ ] Reports & charts
- [ ] Settings pages
