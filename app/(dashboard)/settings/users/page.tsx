import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsersClient from "./_components/UsersClient";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();
  if (profile?.role !== "super_admin") redirect("/settings/zones");

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, avatar_url, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return <UsersClient initialUsers={users ?? []} currentUserId={session.user.id} />;
}
