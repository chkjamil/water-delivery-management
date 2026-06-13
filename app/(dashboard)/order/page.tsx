import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CustomerOrderClient from "./_components/CustomerOrderClient";
import { getEnabledPaymentMethods, getDeliveryFee, getMyAddresses, getCatalogSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Water — AquaFlow" };

export default async function OrderPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name").eq("id", user.id).single();

  if (!["customer", "super_admin", "admin", "staff"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  // Parallel fetches
  const [
    { data: allProducts },
    { addresses },
    { data: timeSlots },
    enabledPayments,
    deliveryFee,
    catalogSettings,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`id, name, sku, price, unit, size_label, product_type, bottle_price, water_price, image_url, is_active,
               inventory:inventory(quantity_in_stock, low_stock_threshold)`)
      .eq("is_active", true)
      .order("product_type")
      .order("name"),
    getMyAddresses(),
    supabase
      .from("time_slots")
      .select("id, label, start_time, end_time, max_orders")
      .eq("is_active", true)
      .order("start_time"),
    getEnabledPaymentMethods(),
    getDeliveryFee(),
    getCatalogSettings(),
  ]);

  // Normalize inventory array and apply OOS visibility rules
  const products = (allProducts ?? [])
    .map((p: any) => ({
      ...p,
      inventory: Array.isArray(p.inventory) ? (p.inventory[0] ?? null) : p.inventory ?? null,
    }))
    .filter((p: any) => {
      const stock = p.inventory?.quantity_in_stock ?? 0;
      if (stock > 0) return true;
      return catalogSettings.showOos; // hide OOS if setting is off
    });

  const greeting = profile?.full_name
    ? `Hello, ${profile.full_name.split(" ")[0]}!`
    : "Welcome!";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{greeting} 💧</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select your products and schedule a delivery</p>
      </div>

      <CustomerOrderClient
        products={products as any}
        addresses={addresses as any}
        timeSlots={(timeSlots ?? []) as any}
        enabledPayments={enabledPayments}
        deliveryFee={deliveryFee}
        customerId={user.id}
        allowOosBooking={catalogSettings.allowOosBooking}
      />
    </div>
  );
}
