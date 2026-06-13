import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BusinessSettingsForm from "./_components/BusinessSettingsForm";

// A simple key-value settings table is expected:
// CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);
// Add this to your SQL migration if not already there.

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();
  if (profile?.role !== "super_admin") redirect("/settings/zones");

  // Load existing settings
  const { data: rows } = await supabase
    .from("app_settings")
    .select("key, value");

  const settings: Record<string, string> = {};
  (rows ?? []).forEach(({ key, value }) => { settings[key] = value; });

  return <BusinessSettingsForm initialValues={settings} />;
}
