"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendOrderConfirmation } from "@/lib/email";
import { formatDate, formatPKR } from "@/lib/format";

async function requireCustomer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone")
    .eq("id", user.id)
    .single();

  // staff/admin can also place orders for testing
  const allowed = ["customer", "super_admin", "admin", "staff"];
  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null, profile: null };
  }
  return { error: null, supabase, user, profile };
}

// ─── Get catalog settings ─────────────────────────────────────────────────────

export async function getCatalogSettings(): Promise<{ showOos: boolean; allowOosBooking: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["show_oos_products", "allow_oos_booking"]);

  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => { map[r.key] = r.value; });
  return {
    showOos:        map["show_oos_products"] !== "false",
    allowOosBooking: map["allow_oos_booking"] === "true",
  };
}

// ─── Get enabled payment methods ─────────────────────────────────────────────

export async function getEnabledPaymentMethods(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["payment_cash_enabled", "payment_online_enabled", "payment_credit_enabled"]);

  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => { map[r.key] = r.value; });

  const enabled: string[] = [];
  if (map["payment_cash_enabled"]   !== "false") enabled.push("cash");
  if (map["payment_online_enabled"] !== "false") enabled.push("online");
  if (map["payment_credit_enabled"] !== "false") enabled.push("credit");
  return enabled;
}

// ─── Get delivery fee ─────────────────────────────────────────────────────────

export async function getDeliveryFee(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "delivery_fee")
    .single();
  return parseFloat(data?.value ?? "0") || 0;
}

// ─── Get customer addresses ───────────────────────────────────────────────────

export async function getMyAddresses() {
  const { error, supabase, user } = await requireCustomer();
  if (error || !supabase || !user) return { error, addresses: [] };

  const { data } = await supabase
    .from("customer_addresses")
    .select("id, label, address_line1, address_line2, city, is_default, zone_id")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false });

  return { error: null, addresses: data ?? [] };
}

// ─── Save new address ─────────────────────────────────────────────────────────

export async function saveAddress(input: {
  label:         string;
  address_line1: string;
  address_line2?: string;
  city:          string;
  zone_id?:      string;
  is_default:    boolean;
}) {
  const { error, supabase, user } = await requireCustomer();
  if (error || !supabase || !user) return { error };

  // Unset previous default if new one is default
  if (input.is_default) {
    await supabase.from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", user.id);
  }

  const { data, error: err } = await supabase
    .from("customer_addresses")
    .insert({ ...input, customer_id: user.id })
    .select()
    .single();

  if (err) return { error: err.message };
  return { error: null, address: data };
}

// ─── Place customer order ─────────────────────────────────────────────────────

export interface CustomerOrderItem {
  product_id:   string;
  product_name: string;
  quantity:     number;
  unit_price:   number;
}

export interface PlaceOrderInput {
  items:          CustomerOrderItem[];
  address_id:     string;
  delivery_date:  string;   // YYYY-MM-DD
  time_slot_id:   string;
  payment_method: "cash" | "online" | "credit";
  note?:          string;
  subtotal:       number;
  delivery_fee:   number;
  discount:       number;
  total:          number;
}

export async function placeCustomerOrder(input: PlaceOrderInput) {
  const { error, supabase, user, profile } = await requireCustomer();
  if (error || !supabase || !user || !profile) return { error };

  if (!input.items.length)      return { error: "Cart is empty" };
  if (!input.address_id)        return { error: "Select a delivery address" };
  if (!input.delivery_date)     return { error: "Select a delivery date" };
  if (!input.time_slot_id)      return { error: "Select a time slot" };

  // 1. Ensure customers row exists (created on first order if missing)
  await supabase
    .from("customers")
    .upsert({ id: user.id, credit_balance: 0, total_spent: 0, loyalty_points: 0, notes: null }, { onConflict: "id", ignoreDuplicates: true });

  // 2. Fetch address for the order record
  const { data: address } = await supabase
    .from("customer_addresses")
    .select("address_line1, address_line2, city")
    .eq("id", input.address_id)
    .single();

  const addressText = [address?.address_line1, address?.address_line2, address?.city]
    .filter(Boolean).join(", ");

  // 3. Create order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_id:          user.id,
      status:               "pending",
      order_type:           "online",
      subtotal:             input.subtotal,
      discount_amount:      input.discount,
      total_amount:         input.total,
      delivery_fee:         input.delivery_fee,
      payment_method:       input.payment_method,
      payment_status:       "unpaid",
      amount_paid:          0,
      delivery_date:        input.delivery_date,
      time_slot_id:         input.time_slot_id,
      address_id:           input.address_id,
      delivery_address:     addressText,
      special_instructions: input.note?.trim() || null,
      created_by:           user.id,
    })
    .select("id, order_number")
    .single();

  if (orderErr) return { error: orderErr.message };

  // 4. Insert order items (subtotal is a GENERATED column — do not insert it)
  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((i) => ({
      order_id:   order.id,
      product_id: i.product_id,
      quantity:   i.quantity,
      unit_price: i.unit_price,
    }))
  );
  if (itemsErr) return { error: itemsErr.message };

  // 5. Fetch time slot label for email
  const { data: slot } = await supabase
    .from("time_slots")
    .select("label")
    .eq("id", input.time_slot_id)
    .single();

  // 6. Send order confirmation email (non-blocking)
  sendOrderConfirmation({
    to:            profile.email,
    customerName:  profile.full_name,
    orderNumber:   order.order_number,
    deliveryDate:  formatDate(input.delivery_date),
    timeSlot:      slot?.label ?? "",
    items:         input.items.map((i) => ({ name: i.product_name, quantity: i.quantity, unitPrice: i.unit_price })),
    subtotal:      input.subtotal,
    deliveryFee:   input.delivery_fee,
    discount:      input.discount,
    total:         input.total,
    address:       addressText,
    paymentMethod: input.payment_method,
  }).catch(console.error);

  revalidatePath("/my-orders");
  revalidatePath("/order");
  return { error: null, order };
}
