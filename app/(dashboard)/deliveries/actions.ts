"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendDeliveryUpdate } from "@/lib/email";

async function requireDeliveryAccess(writeAccess = false) {
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

export async function assignDriver(deliveryId: string, driverId: string) {
  const { error, supabase } = await requireDeliveryAccess(true);
  if (error || !supabase) return { error };

  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({
      driver_id: driverId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/deliveries");
  revalidatePath("/my-deliveries");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function bulkAssignDriver(deliveryIds: string[], driverId: string) {
  const { error, supabase } = await requireDeliveryAccess(true);
  if (error || !supabase) return { error };

  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({
      driver_id: driverId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", deliveryIds);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/deliveries");
  revalidatePath("/my-deliveries");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: string,
  opts?: { failedReason?: string; notes?: string }
) {
  const { error, supabase } = await requireDeliveryAccess(true);
  if (error || !supabase) return { error };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };
  if (newStatus === "dispatched") updates.dispatched_at = now;
  if (newStatus === "delivered") updates.delivered_at = now;
  if (opts?.failedReason) updates.failed_reason = opts.failedReason;
  if (opts?.notes) updates.notes = opts.notes;

  const { error: updateErr } = await supabase
    .from("deliveries")
    .update(updates)
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };

  // Also sync order status
  const statusMap: Record<string, string> = {
    dispatched: "dispatched",
    en_route: "en_route",
    delivered: "delivered",
    failed: "failed",
  };
  if (statusMap[newStatus]) {
    const { data: delivery } = await supabase
      .from("deliveries")
      .select(`
        order_id,
        order:orders(
          order_number, delivery_date,
          customer:profiles!orders_customer_id_fkey(email, full_name),
          time_slot:time_slots(label)
        ),
        driver:profiles!deliveries_driver_id_fkey(full_name)
      `)
      .eq("id", deliveryId)
      .single();

    if (delivery?.order_id) {
      await supabase
        .from("orders")
        .update({ status: statusMap[newStatus], updated_at: now })
        .eq("id", delivery.order_id);

      const order = Array.isArray(delivery.order) ? delivery.order[0] : delivery.order;
      const customer = order ? (Array.isArray(order.customer) ? order.customer[0] : order.customer) : null;
      const slot = order ? (Array.isArray(order.time_slot) ? order.time_slot[0] : order.time_slot) : null;
      const driver = Array.isArray(delivery.driver) ? delivery.driver[0] : delivery.driver;

      if (customer?.email && ["dispatched", "en_route", "delivered", "failed"].includes(newStatus)) {
        try {
          await sendDeliveryUpdate({
            to: customer.email,
            customerName: customer.full_name,
            orderNumber: order?.order_number ?? "",
            status: newStatus,
            driverName: driver?.full_name ?? "Our team",
            deliveryDate: order?.delivery_date ?? "",
            timeSlot: slot?.label ?? "",
          });
        } catch {}
      }
    }
  }

  revalidatePath("/deliveries");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { error: null };
}
