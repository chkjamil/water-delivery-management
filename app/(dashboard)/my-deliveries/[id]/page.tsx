import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DeliveryDetailClient, { type MyDeliveryDetail } from "../_components/DeliveryDetailClient";

export const dynamic = "force-dynamic";

export default async function MyDeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select(`
      id, order_id, status, failed_reason, notes, empty_bottles_collected, delivered_at,
      order:orders(
        id, order_number, delivery_date, total_amount,
        payment_method, payment_status, amount_paid, special_instructions,
        customer:profiles!orders_customer_id_fkey(full_name, phone, email),
        address:customer_addresses(address_line1, address_line2, city),
        time_slot:time_slots(label),
        order_items(
          id, quantity, unit_price,
          product:products(name, size_label)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !delivery) notFound();

  // Guard: staff can only see their own deliveries
  if (profile.role === "staff") {
    const { data: d } = await supabase.from("deliveries").select("driver_id").eq("id", id).single();
    if (d?.driver_id !== user.id) redirect("/my-deliveries");
  }

  const rawOrder = Array.isArray(delivery.order) ? (delivery.order[0] ?? null) : delivery.order ?? null;
  const normalized: MyDeliveryDetail = {
    ...delivery,
    order: rawOrder ? {
      ...rawOrder,
      customer: Array.isArray(rawOrder.customer) ? (rawOrder.customer[0] ?? null) : rawOrder.customer ?? null,
      address: Array.isArray(rawOrder.address) ? (rawOrder.address[0] ?? null) : rawOrder.address ?? null,
      time_slot: Array.isArray(rawOrder.time_slot) ? (rawOrder.time_slot[0] ?? null) : rawOrder.time_slot ?? null,
      order_items: (rawOrder.order_items ?? []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? (item.product[0] ?? null) : item.product ?? null,
      })),
    } : null,
  };

  return <DeliveryDetailClient delivery={normalized} />;
}
