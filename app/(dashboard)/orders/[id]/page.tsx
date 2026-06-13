import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import OrderDetailClient, { type OrderDetail } from "../_components/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const canEdit = ["super_admin", "admin"].includes(profile.role);

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, order_type, total_amount, subtotal, delivery_fee,
      payment_method, payment_status, delivery_date, delivery_address, amount_paid,
      discount_amount, special_instructions, created_at,
      customer:profiles!orders_customer_id_fkey(id, full_name, email, phone),
      time_slot:time_slots(label),
      address:customer_addresses(
        address_line1, address_line2, city,
        zone:delivery_zones(name)
      ),
      order_items(
        id, quantity, unit_price, discount_amount,
        product:products(id, name, sku, size_label)
      ),
      delivery:deliveries(
        id, status, assigned_at, dispatched_at, delivered_at,
        failed_reason, empty_bottles_collected,
        driver:profiles!deliveries_driver_id_fkey(full_name, phone)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) notFound();

  const rawAddress = Array.isArray(order.address) ? (order.address[0] ?? null) : order.address ?? null;
  const rawDelivery = Array.isArray(order.delivery) ? (order.delivery[0] ?? null) : order.delivery ?? null;

  const normalized = {
    ...order,
    customer: Array.isArray(order.customer) ? (order.customer[0] ?? null) : order.customer ?? null,
    time_slot: Array.isArray(order.time_slot) ? (order.time_slot[0] ?? null) : order.time_slot ?? null,
    address: rawAddress ? {
      ...rawAddress,
      zone: Array.isArray(rawAddress.zone) ? (rawAddress.zone[0] ?? null) : rawAddress.zone ?? null,
    } : null,
    delivery: rawDelivery ? {
      ...rawDelivery,
      driver: Array.isArray(rawDelivery.driver) ? (rawDelivery.driver[0] ?? null) : rawDelivery.driver ?? null,
    } : null,
    order_items: (order.order_items ?? []).map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? (item.product[0] ?? null) : item.product ?? null,
    })),
  } as unknown as OrderDetail;

  return <OrderDetailClient order={normalized} canEdit={canEdit} />;
}
