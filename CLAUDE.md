# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build (also generates PWA service worker)
npm run lint      # ESLint via next lint
npm run start     # Serve production build
```

No test suite is configured. There is no `npm test` command.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only, never expose to client
```

Email sending (Resend) requires additional env vars referenced in `lib/email.ts`.

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Supabase · Tailwind CSS · PWA

### Route Groups

- `app/(auth)/` — Public pages: login, register, forgot-password, verify-phone
- `app/(dashboard)/` — All protected pages, wrapped by `app/(dashboard)/layout.tsx`

Each dashboard route follows the same pattern:
```
app/(dashboard)/<feature>/
  page.tsx          # Server Component — fetches data, renders
  actions.ts        # "use server" — all mutations and queries via Server Actions
  loading.tsx       # Optional skeleton
  _components/      # Client Components private to this route
```

### Authentication & Role Routing

`middleware.ts` runs on every request. It:
1. Reads the session from cookies (no network call)
2. **Fetches the role from `public.profiles`** — not from `user_metadata`, which can be stale
3. Redirects customers → `/order`, staff/admin → `/dashboard`
4. Blocks customers from staff routes and vice versa

Roles: `super_admin` → `admin` → `staff` → `customer`. Permission matrix is in `lib/permissions.ts`. Use `hasPermission(role, 'PERMISSION_KEY')` and `getNavForRole(role)` — never hardcode role strings in components.

### Supabase Clients

Three clients exist — use the right one:

| File | Use case |
|---|---|
| `lib/supabase/client.ts` | Client Components (`"use client"`) |
| `lib/supabase/server.ts` | Server Components and Server Actions |
| `lib/supabase/admin.ts` | Server-only; bypasses RLS via service role key |

**Next.js 15 gotcha:** `cookies()` from `next/headers` returns a Promise — always `await` it. The server client (`lib/supabase/server.ts`) already handles this.

### Server Actions Pattern

Every `actions.ts` file re-validates auth and role at the top of each action — middleware is not the only guard. Pattern used throughout:

```ts
async function requireAccess(writeAccess = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // fetch role from profiles, check against allowed list
}
```

After mutations, call `revalidatePath()` to bust the Next.js cache for affected pages.

### Types

All domain types live in `types/index.ts`. Key concepts:

- `UserRole` — `"super_admin" | "admin" | "staff" | "customer"`
- `ProductType` — `"standard" | "refill" | "bundle" | "bottle_only"` — controls pricing logic and the bottle-ledger (`CustomerBottle`). Refill/bundle products have separate `bottle_price` and `water_price` fields.
- `OrderStatus` / `DeliveryStatus` — distinct state machines for orders vs. their deliveries

### PWA

The service worker and manifest are configured in `next.config.js` via `@ducanh2912/next-pwa`. PWA is **disabled in development** (`disable: process.env.NODE_ENV === 'development'`). Generated files (`sw.js`, `workbox-*.js`) appear in `public/` after `npm run build` — do not edit them manually.

### Deployment (Vercel)

The live app is deployed on Vercel with Next.js preset. Key points:

- **Framework Preset** must be set to **Next.js** in Vercel Project Settings → General. Do not change it to "Other" — this breaks the `__dirname` resolution in `next.config.js` and the PWA plugin.
- Add the same three env vars from `.env.local` in Vercel Dashboard → Project → Settings → Environment Variables. Set them for Production (and Preview/Development as needed).
- PWA service worker **is generated at build time** by Vercel — no manual step needed. The `public/sw.js` and `workbox-*.js` outputs are produced during `npm run build`.
- `console.*` calls are stripped in production builds (`removeConsole` is enabled in `next.config.js`).
- To deploy: push to the connected GitHub branch (auto-deploy), or run `vercel --prod` from the CLI.

### Database

Schema lives in `supabase/migrations/001_initial_schema.sql`. Run it once in the Supabase SQL Editor to provision the database. RLS policies are defined there. The app does not use Supabase CLI migrations — apply changes manually via the Supabase dashboard SQL Editor.

To bootstrap a super admin: register a normal account, then manually set `role = 'super_admin'` in the `profiles` table via the Supabase Table Editor.
