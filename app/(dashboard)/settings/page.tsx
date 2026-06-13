import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsIndexPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  // Redirect to the first accessible settings page
  if (profile?.role === "super_admin") redirect("/settings/business");
  redirect("/settings/zones");
}
