"use server";

import { createClient } from "@/lib/supabase/server";

async function requireReportsAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null };
  }
  return { error: null, supabase };
}

export async function getRevenueData(startDate: string, endDate: string) {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error, data: [] };

  const { data, error: err } = await supabase
    .from("orders")
    .select("created_at, total_amount, status")
    .neq("status", "cancelled")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at");

  if (err) return { error: err.message, data: [] };

  // Group by date
  const grouped: Record<string, number> = {};
  for (const order of data ?? []) {
    const date = order.created_at.split("T")[0];
    grouped[date] = (grouped[date] ?? 0) + order.total_amount;
  }

  const result = Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  return { error: null, data: result };
}

export async function getOrderVolumeData(startDate: string, endDate: string) {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error, data: [] };

  const { data, error: err } = await supabase
    .from("orders")
    .select("created_at, status")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at");

  if (err) return { error: err.message, data: [] };

  const grouped: Record<string, number> = {};
  for (const order of data ?? []) {
    const date = order.created_at.split("T")[0];
    grouped[date] = (grouped[date] ?? 0) + 1;
  }

  const result = Object.entries(grouped).map(([date, count]) => ({ date, count }));
  return { error: null, data: result };
}

export async function getTopCustomers(limit = 10, startDate: string, endDate: string) {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error, data: [] };

  const { data, error: err } = await supabase
    .from("orders")
    .select(`
      customer_id, total_amount,
      customer:profiles!orders_customer_id_fkey(full_name, email, phone)
    `)
    .neq("status", "cancelled")
    .not("customer_id", "is", null)
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59");

  if (err) return { error: err.message, data: [] };

  const agg: Record<string, { name: string; email: string; phone: string | null; total: number; count: number }> = {};
  for (const o of data ?? []) {
    const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    if (!o.customer_id || !cust) continue;
    if (!agg[o.customer_id]) {
      agg[o.customer_id] = { name: cust.full_name, email: cust.email, phone: cust.phone, total: 0, count: 0 };
    }
    agg[o.customer_id].total += o.total_amount;
    agg[o.customer_id].count += 1;
  }

  const result = Object.entries(agg)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return { error: null, data: result };
}

export async function getProductBreakdown(startDate: string, endDate: string) {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error, data: [] };

  const { data, error: err } = await supabase
    .from("order_items")
    .select(`
      quantity, unit_price,
      product:products(name, size_label),
      order:orders!order_items_order_id_fkey(status, created_at)
    `)
    .gte("order.created_at", startDate)
    .lte("order.created_at", endDate + "T23:59:59");

  if (err) return { error: err.message, data: [] };

  const agg: Record<string, { name: string; size_label: string; qty: number; revenue: number }> = {};
  for (const item of data ?? []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const order = Array.isArray(item.order) ? item.order[0] : item.order;
    if (!product || order?.status === "cancelled") continue;
    const key = product.name + " " + product.size_label;
    if (!agg[key]) agg[key] = { name: product.name, size_label: product.size_label, qty: 0, revenue: 0 };
    agg[key].qty += item.quantity;
    agg[key].revenue += item.quantity * item.unit_price;
  }

  const result = Object.values(agg).sort((a, b) => b.qty - a.qty);
  return { error: null, data: result };
}

export async function getOutstandingDues() {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error, data: [] };

  const { data, error: err } = await supabase
    .from("customers")
    .select(`
      id, credit_balance,
      profile:profiles!customers_id_fkey(full_name, phone, email)
    `)
    .gt("credit_balance", 0)
    .order("credit_balance", { ascending: false });

  if (err) return { error: err.message, data: [] };

  const result = (data ?? []).map((c) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    return { id: c.id, credit_balance: c.credit_balance, ...profile };
  });

  return { error: null, data: result };
}

export async function exportOrdersCSV(startDate: string, endDate: string): Promise<{ error: string | null; csv: string }> {
  const { error, supabase } = await requireReportsAccess();
  if (error || !supabase) return { error: error ?? "Access denied", csv: "" };

  const { data, error: err } = await supabase
    .from("orders")
    .select(`
      order_number, status, order_type, total_amount, payment_method,
      payment_status, amount_paid, delivery_date, created_at,
      customer:profiles!orders_customer_id_fkey(full_name, phone)
    `)
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at", { ascending: false });

  if (err) return { error: err.message, csv: "" };

  const headers = ["Order #", "Status", "Type", "Customer", "Phone", "Total", "Payment", "Pay Status", "Delivery Date", "Created At"];
  const rows = (data ?? []).map((o) => {
    const c = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    return [
      o.order_number, o.status, o.order_type, c?.full_name ?? "", c?.phone ?? "",
      o.total_amount, o.payment_method ?? "", o.payment_status,
      o.delivery_date ?? "", o.created_at,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return { error: null, csv };
}
