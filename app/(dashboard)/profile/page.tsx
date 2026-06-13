import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./_components/ProfileClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Profile — AquaFlow" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, email_verified, phone_verified")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("customer_addresses")
      .select("id, label, address_line1, address_line2, city, is_default")
      .eq("customer_id", session.user.id)
      .order("is_default", { ascending: false }),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your info, addresses, and password</p>
      </div>

      <ProfileClient
        profile={profile as any}
        addresses={(addresses ?? []) as any}
      />
    </div>
  );
}
