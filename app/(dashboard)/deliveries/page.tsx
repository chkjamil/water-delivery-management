import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DeliveriesClient, { type DeliveryRow, type DriverOption } from "./_components/DeliveriesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deliveries — AquaFlow" };

export default async function DeliveriesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const canAssign = ["super_admin", "admin"].includes(profile.role);

  const [deliveriesRes, driversRes] = await Promise.all([
    supabase
      .from("deliveries")
      .select(`
        id, order_id, status, assigned_at, dispatched_at, delivered_at, failed_reason,
        driver:profiles!deliveries_driver_id_fkey(id, full_name, phone),
        order:orders(
          order_number, delivery_date, total_amount,
          customer:profiles!orders_customer_id_fkey(id, full_name, phone),
          address:customer_addresses(address_line1, city)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "staff")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const deliveries = (deliveriesRes.data ?? []).map((d) => ({
    ...d,
    driver: Array.isArray(d.driver) ? (d.driver[0] ?? null) : d.driver ?? null,
    order: (() => {
      const o = Array.isArray(d.order) ? (d.order[0] ?? null) : d.order ?? null;
      if (!o) return null;
      return {
        ...o,
        customer: Array.isArray(o.customer) ? (o.customer[0] ?? null) : o.customer ?? null,
        address: Array.isArray(o.address) ? (o.address[0] ?? null) : o.address ?? null,
      };
    })(),
  })) as DeliveryRow[];

  const drivers = (driversRes.data ?? []) as DriverOption[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Deliveries</h1>
        <p className="text-sm text-slate-500 mt-0.5">Assign drivers and track delivery progress</p>
      </div>
      <DeliveriesClient initialDeliveries={deliveries} drivers={drivers} canAssign={canAssign} />
    </div>
  );
}
