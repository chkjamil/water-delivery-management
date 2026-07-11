import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MyDeliveriesClient, { type MyDeliveryRow } from "./_components/MyDeliveriesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Deliveries — AquaFlow" };

export default async function MyDeliveriesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const today = new Date().toISOString().split("T")[0];

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select(`
      id, order_id, status,
      order:orders(
        order_number, delivery_date, total_amount,
        payment_method, payment_status, amount_paid,
        customer:profiles!orders_customer_id_fkey(full_name, phone),
        address:customer_addresses(address_line1, address_line2, city),
        time_slot:time_slots(label)
      )
    `)
    .eq("driver_id", session.user.id)
    .or(`status.eq.assigned,status.eq.loaded,status.eq.en_route,status.eq.delivered,status.eq.failed`)
    .gte("created_at", today)
    .order("created_at", { ascending: true });

  const normalized = (deliveries ?? []).map((d) => {
    const o = Array.isArray(d.order) ? (d.order[0] ?? null) : d.order ?? null;
    return {
      ...d,
      order: o ? {
        ...o,
        customer: Array.isArray(o.customer) ? (o.customer[0] ?? null) : o.customer ?? null,
        address: Array.isArray(o.address) ? (o.address[0] ?? null) : o.address ?? null,
        time_slot: Array.isArray(o.time_slot) ? (o.time_slot[0] ?? null) : o.time_slot ?? null,
      } : null,
    };
  }) as MyDeliveryRow[];

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Deliveries</h1>
        <p className="text-sm text-slate-500 mt-0.5">Today&apos;s assigned deliveries</p>
      </div>
      <MyDeliveriesClient initialDeliveries={normalized} />
    </div>
  );
}
