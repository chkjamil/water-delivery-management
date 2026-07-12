import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ScheduleClient from "./_components/ScheduleClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule — AquaFlow" };

export default async function SchedulePage({
  searchParams,
}: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", session.user.id).single();

  const allowed = ["super_admin", "admin"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const now = new Date();
  const planMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: plan }, { data: zones }, { data: drivers }, { data: timeSlots }] = await Promise.all([
    supabase.from("schedule_plans").select("*").eq("plan_month", planMonth).maybeSingle(),
    supabase.from("delivery_zones").select("id, name, delivery_fee, is_active, created_at").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name, phone").in("role", ["staff", "delivery_person"]).eq("is_active", true).order("full_name"),
    supabase.from("time_slots").select("id, label, start_time, end_time, max_orders, is_active").eq("is_active", true).order("start_time"),
  ]);

  const { data: planDays } = plan
    ? await supabase.from("schedule_plan_days").select("*").eq("plan_id", plan.id)
    : { data: [] };

  const monthEnd = new Date(planMonth + "T00:00:00Z");
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const { data: overrides } = await supabase
    .from("schedule_overrides")
    .select("*")
    .gte("override_date", planMonth)
    .lt("override_date", monthEnd.toISOString().split("T")[0])
    .order("override_date");

  return (
    <ScheduleClient
      planMonth={planMonth}
      initialPlan={plan ?? null}
      initialPlanDays={planDays ?? []}
      initialOverrides={overrides ?? []}
      zones={zones ?? []}
      drivers={drivers ?? []}
      timeSlots={timeSlots ?? []}
    />
  );
}
