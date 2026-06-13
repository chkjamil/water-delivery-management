# AquaFlow — Water Delivery Management

A full-featured water delivery business platform built with Next.js 15 and Supabase. Manages orders, deliveries, inventory, POS, customers, and reporting — with role-based access for admins, staff/drivers, and customers.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)

## Features

**Admin / Super Admin**
- Role-aware dashboard with daily revenue, pending deliveries, and low-stock alerts
- Order management — create, edit, update status, record payments, cancel
- Delivery board — assign drivers, track delivery status in real time
- Inventory — manage products (standard, refill, bundle, bottle-only types), stock in/out, bottle returns
- Customer management — profiles, address book, credit balance, bottle ledger
- POS — walk-in sales with customer search, cart, discounts, and payment recording
- Reports — revenue charts, delivery stats, exportable data
- Settings — business info, delivery zones, time slots, payment methods, user management

**Staff / Driver**
- Personal delivery queue with one-tap status updates (loaded → en route → delivered/failed)
- Access to orders, inventory, and POS

**Customer**
- Product catalogue with date/time slot picker for delivery scheduling
- Order history and receipt view
- PWA — installable on mobile for a native-app feel

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| UI | React 19, Tailwind CSS, Lucide React |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Email | Resend |
| Charts | Recharts |
| PWA | @ducanh2912/next-pwa |
| Deployment | Vercel |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/chkjamil/water-delivery-management.git
cd water-delivery-management
npm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor → New query**, paste the contents of `supabase/migrations/001_initial_schema.sql`, and click **Run**
3. Repeat for each subsequent migration file in order (`002_` through `010_`)

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your values from **Supabase Dashboard → Project Settings → API**:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only, never expose to client |
| `NEXT_PUBLIC_APP_URL` | App base URL (`http://localhost:3000` for local dev) |
| `NEXT_PUBLIC_APP_NAME` | Display name (default: `AquaFlow`) |

Add your [Resend](https://resend.com) API key if you want transactional emails:

```
RESEND_API_KEY=re_...
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Bootstrap a Super Admin

1. Register an account at `/register`
2. In **Supabase Dashboard → Table Editor → profiles**, find your row
3. Change the `role` column from `customer` to `super_admin`
4. Log out and back in — you now have full access

## Roles & Access

| Role | Access |
|---|---|
| `super_admin` | Full access including business settings, user management, and audit logs |
| `admin` | All operations except user deletion and business-level settings |
| `staff` | Orders, inventory, POS, and their own delivery queue |
| `customer` | Product catalogue, own orders, and order tracking |

Middleware enforces role separation on every request. Permission definitions live in [`lib/permissions.ts`](lib/permissions.ts).

## Database

Schema and all migrations live in [`supabase/migrations/`](supabase/migrations/). Apply them manually via the Supabase SQL Editor — this project does not use the Supabase CLI. RLS policies are defined in the migration files.

## Deployment

The app is deployed on Vercel.

1. Push to GitHub — Vercel auto-deploys on every push to `main`
2. Add the environment variables in **Vercel Dashboard → Project → Settings → Environment Variables** (same keys as `.env.local`)
3. Ensure the **Framework Preset** in Vercel is set to **Next.js** (not "Other")

The PWA service worker is generated automatically during the Vercel build — no manual step needed.

## PWA

AquaFlow is installable as a Progressive Web App on Android, iOS, and desktop. Icons are in [`public/icons/`](public/icons/). To regenerate icons:

```bash
npm install canvas
node scripts/generate-icons.js
```
