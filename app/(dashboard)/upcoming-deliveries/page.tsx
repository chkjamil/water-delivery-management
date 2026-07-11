import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUpcomingProjection } from "./actions";
import UpcomingDeliveriesClient from "./_components/UpcomingDeliveriesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upcoming Deliveries — AquaFlow" };

export default async function UpcomingDeliveriesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const [{ upcoming }, { data: zones }] = await Promise.all([
    getUpcomingProjection(7),
    supabase.from("delivery_zones").select("id, name"),
  ]);

  const zoneNames = Object.fromEntries((zones ?? []).map((z) => [z.id, z.name]));

  return <UpcomingDeliveriesClient upcoming={upcoming} zoneNames={zoneNames} />;
}
