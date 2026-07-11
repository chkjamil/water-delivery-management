"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendDeliveryUpdate } from "@/lib/email";
import { computeDueCustomers } from "@/lib/delivery-projection";

async function requireDriverOrDeliveryPerson() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  return { error: null, supabase, user, role: profile!.role as string };
}

// ─── Materialize today's (or any date's) due customers into delivery_stops ───
// Lazy generation: no cron infra exists in this repo, so this runs at the top
// of the /my-stops page load. Idempotent via (customer_id, stop_date) unique
// constraint + ignoreDuplicates, so concurrent/repeat page loads are safe.

export async function ensureStopsGenerated(date: string) {
  const { error } = await requireDriverOrDeliveryPerson();
  if (error) return { error };

  const admin = createAdminClient();
  const due = await computeDueCustomers(admin, date);
  if (due.length === 0) return { error: null };

  const { error: insertErr } = await admin
    .from("delivery_stops")
    .upsert(
      due.map((d) => ({
        customer_id: d.customer_id,
        stop_date: date,
        address_id: d.address_id,
        zone_id: d.zone_id,
        driver_id: d.driver_id,
        payment_method_snapshot: d.payment_method_snapshot,
      })),
      { onConflict: "customer_id,stop_date", ignoreDuplicates: true }
    );
  if (insertErr) return { error: insertErr.message };

  // Backfill items for any *pending* stop that still has none — not just ones
  // created this call. Covers the case where a customer's standing order was
  // set up (or edited) after their stop for today already materialized, which
  // would otherwise leave it permanently empty.
  const customerIds = due.map((d) => d.customer_id);
  const { data: stops } = await admin
    .from("delivery_stops")
    .select("id, customer_id, status")
    .eq("stop_date", date)
    .in("customer_id", customerIds);

  const stopByCustomer = new Map((stops ?? []).map((s) => [s.customer_id, s]));
  const pendingStopIds = (stops ?? []).filter((s) => s.status === "pending").map((s) => s.id);

  const { data: existingItems } = pendingStopIds.length > 0
    ? await admin.from("delivery_stop_items").select("stop_id").in("stop_id", pendingStopIds)
    : { data: [] as { stop_id: string }[] };
  const stopsWithItems = new Set((existingItems ?? []).map((r) => r.stop_id));

  const itemRows = due.flatMap((d) => {
    const stop = stopByCustomer.get(d.customer_id);
    if (!stop || stop.status !== "pending" || stopsWithItems.has(stop.id)) return [];
    return d.items.map((item) => ({
      stop_id: stop.id, product_id: item.product_id,
      planned_qty: item.planned_qty, unit_price: item.unit_price,
    }));
  });

  if (itemRows.length > 0) {
    const { error: itemsErr } = await admin.from("delivery_stop_items").insert(itemRows);
    if (itemsErr) return { error: itemsErr.message };
  }

  return { error: null };
}

// ─── Complete a stop: creates the order/delivery, applies payment logic ──────

export interface CompleteStopItemInput { product_id: string; actual_qty: number; }

export async function completeStop(
  stopId: string,
  opts: { items: CompleteStopItemInput[]; cashCollected?: boolean }
) {
  const { error, supabase, user } = await requireDriverOrDeliveryPerson();
  if (error || !supabase || !user) return { error };

  const { data: stop } = await supabase
    .from("delivery_stops")
    .select("driver_id, status")
    .eq("id", stopId)
    .single();
  if (!stop) return { error: "Stop not found" };
  if (stop.driver_id !== user.id) return { error: "Not your stop" };
  if (stop.status !== "pending") return { error: "Stop already actioned" };

  const admin = createAdminClient();

  const { data: fullStop } = await admin
    .from("delivery_stops")
    .select(`
      id, customer_id, address_id, zone_id, driver_id, payment_method_snapshot, stop_date,
      customer:profiles!delivery_stops_customer_id_fkey(email, full_name),
      driver:profiles!delivery_stops_driver_id_fkey(full_name),
      zone:delivery_zones(delivery_fee)
    `)
    .eq("id", stopId)
    .single();
  if (!fullStop) return { error: "Stop not found" };

  const { data: stopItems } = await admin
    .from("delivery_stop_items")
    .select("id, product_id, planned_qty, unit_price")
    .eq("stop_id", stopId);

  const actualByProduct = new Map(opts.items.map((i) => [i.product_id, i.actual_qty]));
  const plannedItems = (stopItems ?? []).map((si) => ({
    ...si,
    actual_qty: actualByProduct.has(si.product_id) ? actualByProduct.get(si.product_id)! : si.planned_qty,
  }));

  await Promise.all(
    plannedItems.map((fi) =>
      admin.from("delivery_stop_items").update({ actual_qty: fi.actual_qty }).eq("id", fi.id)
    )
  );

  // Items the driver added at the door that weren't part of the standing order
  // (planned_qty=0 makes the deviation from "usual order" queryable later).
  const plannedProductIds = new Set(plannedItems.map((fi) => fi.product_id));
  const adHocInputs = opts.items.filter((i) => !plannedProductIds.has(i.product_id) && i.actual_qty > 0);

  let adHocItems: { id: string; product_id: string; unit_price: number; actual_qty: number }[] = [];
  if (adHocInputs.length > 0) {
    const { data: products } = await admin
      .from("products").select("id, price").in("id", adHocInputs.map((i) => i.product_id));
    const priceMap = new Map((products ?? []).map((p) => [p.id, p.price]));

    const { data: inserted, error: adHocErr } = await admin
      .from("delivery_stop_items")
      .insert(adHocInputs.map((i) => ({
        stop_id: stopId, product_id: i.product_id, planned_qty: 0,
        actual_qty: i.actual_qty, unit_price: priceMap.get(i.product_id) ?? 0,
      })))
      .select("id, product_id, unit_price, actual_qty");
    if (adHocErr) return { error: adHocErr.message };
    adHocItems = inserted ?? [];
  }

  const orderItems = [...plannedItems, ...adHocItems].filter((fi) => fi.actual_qty > 0);
  const zone = Array.isArray(fullStop.zone) ? fullStop.zone[0] : fullStop.zone;
  const customer = Array.isArray(fullStop.customer) ? fullStop.customer[0] : fullStop.customer;
  const driver = Array.isArray(fullStop.driver) ? fullStop.driver[0] : fullStop.driver;
  const isMonthly = fullStop.payment_method_snapshot === "monthly";
  const cashCollected = !isMonthly && !!opts.cashCollected;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      customer_id: fullStop.customer_id,
      address_id: fullStop.address_id,
      order_type: "admin",
      status: "delivered",
      delivery_date: fullStop.stop_date,
      delivery_fee: zone?.delivery_fee ?? 0,
      payment_method: isMonthly ? "credit" : "cash",
      payment_status: isMonthly || !cashCollected ? "unpaid" : "paid",
      amount_paid: 0,
      created_by: user.id,
    })
    .select("id, order_number, total_amount, delivery_date")
    .single();
  if (orderErr || !order) return { error: orderErr?.message ?? "Failed to create order" };

  if (orderItems.length > 0) {
    const { error: itemsErr } = await admin.from("order_items").insert(
      orderItems.map((i) => ({ order_id: order.id, product_id: i.product_id, quantity: i.actual_qty, unit_price: i.unit_price }))
    );
    if (itemsErr) return { error: itemsErr.message };
  }

  // recalculate_order_totals() has now run — re-fetch the real total_amount.
  const { data: finalOrder } = await admin.from("orders").select("total_amount").eq("id", order.id).single();
  const totalAmount = finalOrder?.total_amount ?? 0;

  if (cashCollected) {
    await admin.from("orders").update({ amount_paid: totalAmount }).eq("id", order.id);
  } else {
    // Both monthly customers and cash customers who didn't pay on the spot accrue
    // into the same credit_balance for one unified "who owes money" view.
    await admin.rpc("increment_customer_balance", { p_customer_id: fullStop.customer_id, p_amount: totalAmount });
    await admin.from("customer_credit_transactions").insert({
      customer_id: fullStop.customer_id, type: "accrual", amount: totalAmount,
      related_order_id: order.id, note: isMonthly ? "Monthly account delivery" : "Unpaid cash delivery",
      created_by: user.id,
    });
  }

  const { data: delivery } = await admin
    .from("deliveries").select("id").eq("order_id", order.id).single();
  if (delivery) {
    await admin.from("deliveries").update({
      driver_id: fullStop.driver_id, status: "delivered", delivered_at: new Date().toISOString(),
    }).eq("id", delivery.id);
  }

  await admin.from("delivery_stops").update({
    status: "completed", order_id: order.id, delivery_id: delivery?.id ?? null,
    cash_collected: isMonthly ? null : cashCollected,
    completed_at: new Date().toISOString(), completed_by: user.id,
  }).eq("id", stopId);

  if (customer?.email) {
    try {
      await sendDeliveryUpdate({
        to: customer.email,
        customerName: customer.full_name,
        orderNumber: order.order_number,
        status: "delivered",
        driverName: driver?.full_name ?? "Our team",
        deliveryDate: order.delivery_date ?? "",
        timeSlot: "",
      });
    } catch {}
  }

  revalidatePath("/my-stops");
  return { error: null, orderId: order.id };
}

// ─── Skip a stop: no order/delivery created ───────────────────────────────────

export async function skipStop(stopId: string, reason: string) {
  const { error, supabase, user } = await requireDriverOrDeliveryPerson();
  if (error || !supabase || !user) return { error };

  const { data: stop } = await supabase
    .from("delivery_stops").select("driver_id, status").eq("id", stopId).single();
  if (!stop) return { error: "Stop not found" };
  if (stop.driver_id !== user.id) return { error: "Not your stop" };
  if (stop.status !== "pending") return { error: "Stop already actioned" };

  const { error: err } = await supabase
    .from("delivery_stops")
    .update({
      status: "skipped", skipped_reason: reason,
      completed_at: new Date().toISOString(), completed_by: user.id,
    })
    .eq("id", stopId);

  if (err) return { error: err.message };
  revalidatePath("/my-stops");
  return { error: null };
}
