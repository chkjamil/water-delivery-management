import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InventoryClient from "./_components/InventoryClient";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowedRoles = ["super_admin", "admin", "staff"];
  if (!profile || !allowedRoles.includes(profile.role)) redirect("/dashboard");

  const isWriter = ["super_admin", "admin"].includes(profile.role);

  // Fetch products with their inventory data in one join
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, sku, description, price, unit, size_label,
      product_type, bottle_price, water_price, image_url, is_active, created_at,
      inventory:inventory(
        id, quantity_in_stock, low_stock_threshold,
        empty_bottles_returned, last_restocked_at, updated_at
      )
    `)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Supabase returns one-to-many joins as arrays; flatten inventory to a single object | null
  const normalizedProducts = (products ?? []).map((p) => ({
    ...p,
    inventory: Array.isArray(p.inventory)
      ? (p.inventory[0] ?? null)
      : p.inventory ?? null,
  })) as import("./_components/InventoryClient").InventoryProduct[];

  // Low stock products (from DB view)
  const { data: lowStockRaw } = await supabase
    .from("low_stock_products")
    .select("id, name, sku, size_label, quantity_in_stock, low_stock_threshold");

  // Recent transactions (last 50)
  const { data: transactions } = await supabase
    .from("stock_transactions")
    .select(`
      id, transaction_type, quantity, note, created_at,
      product:products(id, name, sku, size_label),
      performed_by_profile:profiles!stock_transactions_performed_by_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Normalize joined arrays to single objects | null (Supabase one-to-many quirk)
  const normalizedTransactions = (transactions ?? []).map((t) => ({
    ...t,
    product: Array.isArray(t.product) ? (t.product[0] ?? null) : t.product ?? null,
    performed_by_profile: Array.isArray(t.performed_by_profile)
      ? (t.performed_by_profile[0] ?? null)
      : t.performed_by_profile ?? null,
  })) as import("./_components/InventoryClient").TransactionRow[];

  return (
    <InventoryClient
      products={normalizedProducts}
      lowStockItems={lowStockRaw ?? []}
      transactions={normalizedTransactions}
      canWrite={isWriter}
    />
  );
}
