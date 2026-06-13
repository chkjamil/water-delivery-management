"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendDeliveryUpdate } from "@/lib/email";

async function requireOrdersAccess(writeAccess = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const allowed = writeAccess
    ? ["super_admin", "admin"]
    : ["super_admin", "admin", "staff"];

  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

export async function getOrders() {
  const { error, supabase } = await requireOrdersAccess();
  if (error || !supabase) return { error, orders: [] };

  const { data, error: err } = await supabase
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

  if (err) return { error: err.message, orders: [] };
  return { error: null, orders: data ?? [] };
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const { error, supabase } = await requireOrdersAccess(true);
  if (error || !supabase) return { error };

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select(`
      id, order_number, delivery_date,
      customer:profiles!orders_customer_id_fkey(email, full_name),
      time_slot:time_slots(label)
    `)
    .eq("id", orderId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateErr) return { error: updateErr.message };

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const slot = Array.isArray(order.time_slot) ? order.time_slot[0] : order.time_slot;
  if (customer?.email && ["dispatched", "en_route", "delivered", "failed"].includes(newStatus)) {
    try {
      await sendDeliveryUpdate({
        to: customer.email,
        customerName: customer.full_name,
        orderNumber: order.order_number,
        status: newStatus,
        driverName: "Our team",
        deliveryDate: order.delivery_date ?? "",
        timeSlot: slot?.label ?? "",
      });
    } catch {}
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/deliveries");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function recordPayment(orderId: string, amount: number, method: string) {
  const { error, supabase } = await requireOrdersAccess(true);
  if (error || !supabase) return { error };

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("total_amount, amount_paid")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return { error: fetchErr?.message ?? "Order not found" };

  const newAmountPaid = (order.amount_paid ?? 0) + amount;
  const paymentStatus =
    newAmountPaid >= order.total_amount ? "paid"
    : newAmountPaid > 0 ? "partial"
    : "unpaid";

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      amount_paid: newAmountPaid,
      payment_status: paymentStatus,
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function cancelOrder(orderId: string, reason: string) {
  const { error, supabase } = await requireOrdersAccess(true);
  if (error || !supabase) return { error };

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      special_instructions: reason ? `CANCELLED: ${reason}` : "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/deliveries");
  revalidatePath("/dashboard");
  return { error: null };
}
