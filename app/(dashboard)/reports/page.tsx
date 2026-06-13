import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportsClient from "./_components/ReportsClient";
import {
  getRevenueData,
  getOrderVolumeData,
  getTopCustomers,
  getProductBreakdown,
  getOutstandingDues,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — AquaFlow" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) redirect("/dashboard");

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  })();

  const [revenueRes, volumeRes, customersRes, productsRes, duesRes] = await Promise.all([
    getRevenueData(startDate, endDate),
    getOrderVolumeData(startDate, endDate),
    getTopCustomers(10, startDate, endDate),
    getProductBreakdown(startDate, endDate),
    getOutstandingDues(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Business insights and performance overview</p>
      </div>
      <ReportsClient
        initialRevenue={revenueRes.data as any}
        initialVolume={volumeRes.data as any}
        initialTopCustomers={customersRes.data as any}
        initialProducts={productsRes.data as any}
        initialDues={duesRes.data as any}
        defaultStart={startDate}
        defaultEnd={endDate}
      />
    </div>
  );
}
