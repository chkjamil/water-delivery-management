import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsNav from "./_components/SettingsNav";
import type { UserRole } from "@/types";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only admin+ can access settings
  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your business configuration.</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav role={profile.role as UserRole} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
