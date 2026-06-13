"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProductType } from "@/types";

// ─── Permission guard ─────────────────────────────────────────────────────────

async function requireInventoryAccess(writeAccess = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const writeRoles = ["super_admin", "admin"];
  const readRoles  = ["super_admin", "admin", "staff"];

  if (writeAccess && !writeRoles.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  if (!writeAccess && !readRoles.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductFormData {
  id?:                 string;
  name:                string;
  sku:                 string;
  description:         string;
  product_type:        ProductType;
  price:               number;
  bottle_price:        number;
  water_price:         number;
  unit:                string;
  size_label:          string;
  low_stock_threshold: number;
  is_active:           boolean;
}

export async function upsertProduct(data: ProductFormData) {
  const { error, supabase, user } = await requireInventoryAccess(true);
  if (error || !supabase || !user) return { error };

  // Derive price from type
  let price = data.price;
  if (data.product_type === "bundle")      price = data.bottle_price + data.water_price;
  if (data.product_type === "refill")      price = data.water_price;
  if (data.product_type === "bottle_only") price = data.bottle_price;

  const payload = {
    name:         data.name.trim(),
    sku:          data.sku.trim().toUpperCase(),
    description:  data.description.trim() || null,
    product_type: data.product_type,
    price,
    bottle_price: data.bottle_price,
    water_price:  data.water_price,
    unit:         data.unit.trim(),
    size_label:   data.size_label.trim(),
    is_active:    data.is_active,
  };

  if (data.id) {
    const { data: product, error: err } = await supabase
      .from("products").update(payload).eq("id", data.id).select().single();
    if (err) return { error: err.message };

    // Also update threshold if changed
    await supabase.from("inventory")
      .update({ low_stock_threshold: data.low_stock_threshold })
      .eq("product_id", data.id);

    revalidatePath("/inventory");
    return { error: null, product };
  } else {
    const { data: product, error: err } = await supabase
      .from("products").insert(payload).select().single();
    if (err) return { error: err.message };

    // Update the auto-created inventory row's threshold
    await supabase.from("inventory")
      .update({ low_stock_threshold: data.low_stock_threshold })
      .eq("product_id", product.id);

    revalidatePath("/inventory");
    return { error: null, product };
  }
}

export async function archiveProduct(id: string) {
  const { error, supabase } = await requireInventoryAccess(true);
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("products").update({ is_active: false }).eq("id", id);
  if (err) return { error: err.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function restoreProduct(id: string) {
  const { error, supabase } = await requireInventoryAccess(true);
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("products").update({ is_active: true }).eq("id", id);
  if (err) return { error: err.message };

  revalidatePath("/inventory");
  return { error: null };
}

// ─── Stock In ─────────────────────────────────────────────────────────────────

export async function stockIn(data: {
  product_id: string;
  quantity:   number;
  note:       string;
}) {
  const { error, supabase, user } = await requireInventoryAccess(true);
  if (error || !supabase || !user) return { error };

  if (data.quantity <= 0) return { error: "Quantity must be greater than 0" };

  const { error: err } = await supabase.from("stock_transactions").insert({
    product_id:       data.product_id,
    transaction_type: "stock_in",
    quantity:         data.quantity,
    note:             data.note.trim() || null,
    performed_by:     user.id,
  });

  if (err) return { error: err.message };

  revalidatePath("/inventory");
  return { error: null };
}

// ─── Stock Adjustment ─────────────────────────────────────────────────────────

export async function adjustStock(data: {
  product_id:     string;
  new_quantity:   number;
  reason:         string;
}) {
  const { error, supabase, user } = await requireInventoryAccess(true);
  if (error || !supabase || !user) return { error };

  if (!data.reason.trim()) return { error: "Reason is required for stock adjustments" };
  if (data.new_quantity < 0) return { error: "Quantity cannot be negative" };

  const { error: err } = await supabase.from("stock_transactions").insert({
    product_id:       data.product_id,
    transaction_type: "adjustment",
    quantity:         data.new_quantity,
    note:             `Adjustment: ${data.reason.trim()}`,
    performed_by:     user.id,
  });

  if (err) return { error: err.message };

  revalidatePath("/inventory");
  return { error: null };
}

// ─── Bottle Returns ───────────────────────────────────────────────────────────

export async function recordBottleReturn(data: {
  product_id: string;
  quantity:   number;
  note:       string;
}) {
  const { error, supabase, user } = await requireInventoryAccess(false); // staff can record returns
  if (error || !supabase || !user) return { error };

  if (data.quantity <= 0) return { error: "Quantity must be greater than 0" };

  const { error: txErr } = await supabase.from("stock_transactions").insert({
    product_id:       data.product_id,
    transaction_type: "return",
    quantity:         data.quantity,
    note:             data.note.trim() || "Empty bottle return",
    performed_by:     user.id,
  });

  if (txErr) return { error: txErr.message };

  // Also update the empty_bottles_returned counter
  await supabase.rpc("increment_empty_returns", {
    p_product_id: data.product_id,
    p_quantity:   data.quantity,
  });

  revalidatePath("/inventory");
  return { error: null };
}

// ─── Transaction history ──────────────────────────────────────────────────────

export async function getTransactionHistory(productId?: string, page = 1, perPage = 20) {
  const { error, supabase } = await requireInventoryAccess(false);
  if (error || !supabase) return { error, transactions: [] };

  let query = supabase
    .from("stock_transactions")
    .select(`
      id, transaction_type, quantity, note, created_at,
      product:products(name, sku, size_label),
      performed_by_profile:profiles!stock_transactions_performed_by_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (productId) query = query.eq("product_id", productId);

  const { data, error: fetchErr } = await query;
  if (fetchErr) return { error: fetchErr.message, transactions: [] };

  return { transactions: data ?? [], error: null };
}
