import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import OrderReceiptClient, { type OrderReceipt } from "./_components/OrderReceiptClient";

export const dynamic = "force-dynamic";

export default async function MyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles").select("role, id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, created_at, delivery_date, delivery_address,
      total_amount, subtotal, delivery_fee, discount_amount,
      payment_method, payment_status, amount_paid, special_instructions,
      time_slot:time_slots(label),
      address:customer_addresses(address_line1, address_line2, city),
      delivery:deliveries(
        status,
        delivered_at,
        driver:profiles!deliveries_driver_id_fkey(full_name)
      ),
      order_items(
        id, quantity, unit_price, discount_amount,
        product:products(name, size_label)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) notFound();

  // Customers can only view their own orders; admins can view any
  const isAdmin = ["super_admin", "admin", "staff"].includes(profile.role);
  if (!isAdmin) {
    const { data: orderCheck } = await supabase
      .from("orders").select("customer_id").eq("id", id).single();
    if (orderCheck?.customer_id !== user.id) redirect("/my-orders");
  }

  const normalized: OrderReceipt = {
    ...order,
    time_slot: Array.isArray(order.time_slot) ? (order.time_slot[0] ?? null) : order.time_slot ?? null,
    address: Array.isArray(order.address) ? (order.address[0] ?? null) : order.address ?? null,
    delivery: (() => {
      const d = Array.isArray(order.delivery) ? (order.delivery[0] ?? null) : order.delivery ?? null;
      if (!d) return null;
      return { ...d, driver: Array.isArray(d.driver) ? (d.driver[0] ?? null) : d.driver ?? null };
    })(),
    order_items: (order.order_items ?? []).map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? (item.product[0] ?? null) : item.product ?? null,
    })),
  };

  return <OrderReceiptClient order={normalized} />;
}
