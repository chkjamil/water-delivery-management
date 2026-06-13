import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ZonesClient from "./_components/ZonesClient";

export default async function ZonesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return <ZonesClient initialZones={zones ?? []} />;
}
