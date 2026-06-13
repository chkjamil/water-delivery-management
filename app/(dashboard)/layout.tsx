import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayoutClient from "./DashboardLayoutClient";
import type { UserRole } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // createClient() is async in Next.js 15 (cookies() is awaited inside)
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_inactive");
  }

  return (
    <DashboardLayoutClient
      role={profile.role as UserRole}
      fullName={profile.full_name || profile.email}
      email={profile.email}
    >
      {children}
    </DashboardLayoutClient>
  );
}
