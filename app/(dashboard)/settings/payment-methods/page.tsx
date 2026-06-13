import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PaymentMethodsClient from "./_components/PaymentMethodsClient";
import CatalogSettingsCard from "./_components/CatalogSettingsCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment Methods — AquaFlow Settings" };

export default async function PaymentMethodsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const { data: rows } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "payment_cash_enabled",
      "payment_online_enabled",
      "payment_credit_enabled",
      "delivery_fee",
      "show_oos_products",
      "allow_oos_booking",
    ]);

  const settings: Record<string, string> = {};
  (rows ?? []).forEach((r) => { settings[r.key] = r.value; });

  return (
    <div className="space-y-1 mb-6">
      <h1 className="text-xl font-bold text-slate-800">Payment Methods</h1>
      <p className="text-sm text-slate-500">
        Control which payment options customers can use at checkout.
      </p>
      <div className="pt-4 space-y-6">
        <PaymentMethodsClient initialSettings={settings} />
        <CatalogSettingsCard settings={settings} />
      </div>
    </div>
  );
}
