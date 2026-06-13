import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Routes only customers can access
const CUSTOMER_ROUTES = ["/order", "/my-orders"];
// Routes staff/admin/super_admin can access (customers cannot)
const STAFF_ROUTES    = ["/orders", "/deliveries", "/inventory", "/pos",
                         "/customers", "/reports", "/settings", "/my-deliveries"];

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

  // ── 1. Public routes ───────────────────────────────────────────────────────
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user) {
      const dest = role === "customer" ? "/order" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return supabaseResponse;
  }

  // ── 2. Root redirect ───────────────────────────────────────────────────────
  if (pathname === "/") {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const dest = role === "customer" ? "/order" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── 3. Require authentication ──────────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Role-based route separation ────────────────────────────────────────
  const isCustomerRoute = CUSTOMER_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isStaffRoute = STAFF_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (role === "customer") {
    if (isStaffRoute) return NextResponse.redirect(new URL("/order", request.url));
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
