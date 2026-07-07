import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

/**
 * Supabase redirects here after a user clicks their email confirmation link.
 * We exchange the auth code for a session, then send the welcome email
 * (only once — on first confirmation).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  // Supabase passes error directly in some flows (e.g. expired link)
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(searchParams.get("error_description") ?? error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data: { user }, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionErr || !user) {
    return NextResponse.redirect(`${origin}/login?error=session_exchange_failed`);
  }

  // Password-recovery flow: session is established, hand off to reset-password.
  // Skip welcome-email / phone-verification side effects below — those are
  // signup-specific and would misfire for an existing user resetting a password.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Fetch profile to check if this is the first confirmation
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email_verified, phone_verified, role")
    .eq("id", user.id)
    .single();

  // Send welcome email only on the very first email confirmation
  // email_verified was false before; the DB trigger will have set it true now
  if (profile && !profile.email_verified && profile.role === "customer") {
    await sendWelcomeEmail({
      to:           user.email!,
      customerName: profile.full_name || user.email!,
    });
  }

  // After email confirmation, prompt phone verification if not done yet
  if (profile && !profile.phone_verified && profile.role === "customer") {
    return NextResponse.redirect(`${origin}/verify-phone`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
