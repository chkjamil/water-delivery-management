import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CustomerClient from "./_components/CustomerClient";
import { getCustomers } from "./actions";

export const metadata = { title: "Customers — AquaFlow" };

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) redirect("/dashboard");

  const { customers } = await getCustomers();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage customer accounts, verification, and credit</p>
      </div>
      <CustomerClient initialCustomers={customers as any} />
    </div>
  );
}
