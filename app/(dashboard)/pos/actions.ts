"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requirePOSAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ─── Fetch active products for POS grid ──────────────────────────────────────

export async function getPOSProducts() {
  const { error, supabase } = await requirePOSAccess();
  if (error || !supabase) return { error, products: [] };

  const { data, error: err } = await supabase
    .from("products")
    .select(`
      id, name, sku, price, unit, size_label,
      product_type, bottle_price, water_price, image_url, is_active,
      inventory:inventory(quantity_in_stock, low_stock_threshold)
    `)
    .eq("is_active", true)
    .order("name");

  if (err) return { error: err.message, products: [] };
  return { error: null, products: data ?? [] };
}

// ─── Customer search ──────────────────────────────────────────────────────────

export async function searchCustomers(query: string) {
  const { error, supabase } = await requirePOSAccess();
  if (error || !supabase) return { error, customers: [] };

  // full_name, phone, email, is_active live on profiles
  // credit_balance lives on customers (joined via profiles.id = customers.id)
  const { data, error: err } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, is_active, customers(credit_balance)")
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .eq("role", "customer")
    .eq("is_active", true)
    .limit(10);

  if (err) return { error: err.message, customers: [] };

  // Flatten the nested customers join into a single balance field
  const customers = (data ?? []).map((p) => ({
    id:        p.id,
    full_name: p.full_name,
    phone:     p.phone,
    email:     p.email,
    balance:   (p.customers as any)?.[0]?.credit_balance ?? (p.customers as any)?.credit_balance ?? 0,
  }));

  return { error: null, customers };
}

// ─── Create POS order ─────────────────────────────────────────────────────────

export interface POSOrderItem {
  product_id:   string;
  product_name: string;
  quantity:     number;
  unit_price:   number;
}

export interface CreatePOSOrderInput {
  customer_id?:    string;           // null = walk-in
  items:           POSOrderItem[];
  subtotal:        number;
  discount:        number;
  total:           number;
  payment_method:  "cash" | "credit" | "online";
  amount_paid:     number;           // 0 for credit orders
  note?:           string;
}

export async function createPOSOrder(input: CreatePOSOrderInput) {
  const { error, supabase, user } = await requirePOSAccess();
  if (error || !supabase || !user) return { error };

  if (!input.items.length) return { error: "Cart is empty" };
  if (input.total <= 0)    return { error: "Invalid order total" };

  // ── 1. Create order ──
  // Only include customer_id when a real customer is selected (walk-in omits it)
  const orderPayload: Record<string, unknown> = {
    status:               "confirmed",
    order_type:           "pos",
    subtotal:             input.subtotal,
    discount_amount:      input.discount,
    total_amount:         input.total,
    delivery_fee:         0,
    payment_method:       input.payment_method,
    payment_status:       input.payment_method === "credit" ? "unpaid" : "paid",
    amount_paid:          input.amount_paid,
    special_instructions: input.note?.trim() || null,
    created_by:           user.id,
  };
  if (input.customer_id) orderPayload.customer_id = input.customer_id;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id, order_number")
    .single();

  if (orderErr) return { error: orderErr.message };

  // ── 2. Insert order items ──
  // subtotal is a GENERATED ALWAYS column — do not insert it
  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id:   order.id,
      product_id: item.product_id,
      quantity:   item.quantity,
      unit_price: item.unit_price,
    }))
  );

  if (itemsErr) return { error: itemsErr.message };

  // ── 3. If credit payment — add to customer balance ──
  if (input.payment_method === "credit" && input.customer_id) {
    await supabase.rpc("increment_customer_balance", {
      p_customer_id: input.customer_id,
      p_amount:      input.total - input.amount_paid,
    });
  }

  revalidatePath("/pos");
  revalidatePath("/inventory");
  revalidatePath("/orders");

  return { error: null, order };
}
