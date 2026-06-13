import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import POSClient from "./_components/POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin", "staff"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  // Fetch active products with inventory
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, name, sku, price, unit, size_label,
      product_type, bottle_price, water_price, image_url, is_active,
      inventory:inventory(quantity_in_stock, low_stock_threshold)
    `)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Point of Sale</h1>
        <p className="text-sm text-slate-500 mt-0.5">Walk-in sales — tap a product to add to cart</p>
      </div>
      <POSClient initialProducts={(products ?? []).map((p) => ({
        ...p,
        inventory: Array.isArray(p.inventory) ? (p.inventory[0] ?? null) : p.inventory ?? null,
      })) as import("./_components/POSClient").POSProduct[]} />
    </div>
  );
}
