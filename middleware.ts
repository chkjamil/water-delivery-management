import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

// Reachable regardless of auth state: unauthenticated visits show
// "invalid/expired link"; authenticated visits are the expected case
// (session was just created via the recovery code exchange in
// /auth/callback) and must NOT be bounced away like other public routes.
const ALWAYS_ALLOWED_ROUTES = ["/reset-password"];

// Routes only customers can access
const CUSTOMER_ROUTES = ["/order", "/my-orders"];
// Routes only delivery_person can access (narrow allowlist, not "everything else")
const DELIVERY_PERSON_ROUTES = ["/my-deliveries", "/my-stops", "/upcoming-deliveries"];
// Back-office routes: admin/super_admin/staff only — customers and delivery_person are both blocked
const BACK_OFFICE_ROUTES = ["/orders", "/deliveries", "/inventory", "/pos",
                            "/customers", "/reports", "/settings", "/schedule"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads straight from the cookie — no network call to Auth server.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;

  // ── Resolve role from public.profiles (single source of truth) ────────────
  // user_metadata can be stale/missing for accounts created before role sync.
  // public.profiles is always accurate, so we query it when the user is logged in.
  let role = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (profile?.role as string) ?? "customer";
  }

  // ── 1. Always-allowed routes (bypass auth-based redirects entirely) ────────
  if (ALWAYS_ALLOWED_ROUTES.some((r) => pathname.startsWith(r))) {
    return supabaseResponse;
  }

  // ── 2. Public routes ───────────────────────────────────────────────────────
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // ── 3. Root redirect ───────────────────────────────────────────────────────
  if (pathname === "/") {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── 4. Require authentication ──────────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Role-based route separation ────────────────────────────────────────
  const matches = (routes: string[]) =>
    routes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const isCustomerRoute = matches(CUSTOMER_ROUTES);
  const isDeliveryPersonRoute = matches(DELIVERY_PERSON_ROUTES);
  const isBackOfficeRoute = matches(BACK_OFFICE_ROUTES);

  if (role === "customer") {
    if (isDeliveryPersonRoute || isBackOfficeRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else if (role === "delivery_person") {
    if (isCustomerRoute || isBackOfficeRoute) {
      return NextResponse.redirect(new URL("/my-deliveries", request.url));
    }
  } else {
    if (isCustomerRoute) return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox.*|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
