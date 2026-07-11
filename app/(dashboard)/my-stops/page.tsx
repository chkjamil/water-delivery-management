import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureStopsGenerated } from "./actions";
import MyStopsClient, { type MyStopRow } from "./_components/MyStopsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Stops — AquaFlow" };

export default async function MyStopsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const today = new Date().toISOString().split("T")[0];
  await ensureStopsGenerated(today);

  const [{ data: stops }, { data: products }] = await Promise.all([
    supabase
      .from("delivery_stops")
      .select(`
        id, status, payment_method_snapshot, cash_collected, skipped_reason,
        customer:profiles!delivery_stops_customer_id_fkey(full_name, phone),
        address:customer_addresses(address_line1, address_line2, city),
        items:delivery_stop_items(id, product_id, planned_qty, actual_qty, unit_price, product:products(name, size_label))
      `)
      .eq("driver_id", session.user.id)
      .eq("stop_date", today)
      .order("status"),
    supabase.from("products").select("id, name, size_label").eq("is_active", true).order("name"),
  ]);

  const normalized: MyStopRow[] = (stops ?? []).map((s: any) => ({
    ...s,
    customer: Array.isArray(s.customer) ? (s.customer[0] ?? null) : s.customer,
    address: Array.isArray(s.address) ? (s.address[0] ?? null) : s.address,
    items: (s.items ?? []).map((it: any) => ({
      ...it,
      product: Array.isArray(it.product) ? (it.product[0] ?? null) : it.product,
    })),
  }));

  return <MyStopsClient initialStops={normalized} products={products ?? []} />;
}
