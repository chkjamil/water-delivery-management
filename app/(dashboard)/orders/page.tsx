import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrdersClient, { type OrderRow } from "./_components/OrdersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — AquaFlow" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const canEdit = ["super_admin", "admin"].includes(profile.role);

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, order_type, total_amount, payment_method,
      payment_status, delivery_date, delivery_address, amount_paid,
      discount_amount, created_at,
      customer:profiles!orders_customer_id_fkey(id, full_name, email, phone),
      time_slot:time_slots(label)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  const normalized = (orders ?? []).map((o) => ({
    ...o,
    customer: Array.isArray(o.customer) ? (o.customer[0] ?? null) : o.customer ?? null,
    time_slot: Array.isArray(o.time_slot) ? (o.time_slot[0] ?? null) : o.time_slot ?? null,
  })) as OrderRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage and track all customer orders</p>
      </div>
      <OrdersClient initialOrders={normalized} canEdit={canEdit} />
    </div>
  );
}
