"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireScheduleAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

function monthStart(planMonth: string) {
  // Normalize any "YYYY-MM" or "YYYY-MM-DD" input to the 1st of that month.
  const [y, m] = planMonth.split("-");
  return `${y}-${m}-01`;
}

function isPastMonth(planMonth: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return planMonth < currentMonth;
}

function shiftMonthStr(month: string, delta: number) {
  const d = new Date(month + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().split("T")[0];
}

// Shared by getOrCreatePlan's auto-continue and copyPlanToNextMonth's explicit copy.
async function cloneDaysToNewPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourcePlanId: string,
  newPlanId: string
) {
  const { data: sourceDays } = await supabase
    .from("schedule_plan_days")
    .select("day_of_week, zone_id, driver_id, time_slot_id")
    .eq("plan_id", sourcePlanId);

  if (!sourceDays || sourceDays.length === 0) return { error: null, days: [] };

  const { data: inserted, error } = await supabase
    .from("schedule_plan_days")
    .insert(sourceDays.map((d) => ({ ...d, plan_id: newPlanId })))
    .select();
  if (error) return { error: error.message, days: [] };
  return { error: null, days: inserted ?? [] };
}

// ─── Get or create the plan for a given month ─────────────────────────────────
// If none exists yet, auto-continues from the immediately-prior month's plan
// (if it has one) rather than starting blank — admins shouldn't have to
// remember to carry the roster forward every month.

export async function getOrCreatePlan(planMonth: string) {
  const { error, supabase, user } = await requireScheduleAdmin();
  if (error || !supabase || !user) return { error, plan: null, planDays: [], clonedFromPrevious: false };

  const month = monthStart(planMonth);

  const { data: existing } = await supabase
    .from("schedule_plans").select("*").eq("plan_month", month).maybeSingle();
  if (existing) return { error: null, plan: existing, planDays: [], clonedFromPrevious: false };

  const { data: created, error: err } = await supabase
    .from("schedule_plans")
    .insert({ plan_month: month, created_by: user.id })
    .select()
    .single();
  if (err) return { error: err.message, plan: null, planDays: [], clonedFromPrevious: false };

  const prevMonth = shiftMonthStr(month, -1);
  const { data: prevPlan } = await supabase
    .from("schedule_plans").select("id").eq("plan_month", prevMonth).maybeSingle();

  let clonedFromPrevious = false;
  let planDays: { day_of_week: number; zone_id: string; driver_id: string | null; time_slot_id: string | null }[] = [];
  if (prevPlan) {
    const cloneResult = await cloneDaysToNewPlan(supabase, prevPlan.id, created.id);
    if (cloneResult.error) return { error: cloneResult.error, plan: null, planDays: [], clonedFromPrevious: false };
    clonedFromPrevious = true;
    planDays = cloneResult.days ?? [];
  }

  revalidatePath("/schedule");
  return { error: null, plan: created, planDays, clonedFromPrevious };
}

// ─── Plan days (weekly template) ───────────────────────────────────────────────

export async function upsertPlanDay(
  planId: string, dayOfWeek: number, zoneId: string,
  driverId: string | null, timeSlotId: string | null
) {
  const { error, supabase } = await requireScheduleAdmin();
  if (error || !supabase) return { error };

  const { data: plan } = await supabase.from("schedule_plans").select("plan_month").eq("id", planId).single();
  if (plan && isPastMonth(plan.plan_month)) return { error: "Cannot edit a plan for a month that has already passed" };

  const { data, error: err } = await supabase
    .from("schedule_plan_days")
    .upsert(
      { plan_id: planId, day_of_week: dayOfWeek, zone_id: zoneId, driver_id: driverId, time_slot_id: timeSlotId },
      { onConflict: "plan_id,day_of_week,zone_id" }
    )
    .select()
    .single();

  if (err) return { error: err.message };
  revalidatePath("/schedule");
  return { error: null, planDay: data };
}

export async function deletePlanDay(planDayId: string) {
  const { error, supabase } = await requireScheduleAdmin();
  if (error || !supabase) return { error };

  const { data: row } = await supabase
    .from("schedule_plan_days")
    .select("plan_id, schedule_plans(plan_month)")
    .eq("id", planDayId)
    .single();
  const plan = row ? (Array.isArray(row.schedule_plans) ? row.schedule_plans[0] : row.schedule_plans) : null;
  if (plan && isPastMonth(plan.plan_month)) return { error: "Cannot edit a plan for a month that has already passed" };

  const { error: err } = await supabase.from("schedule_plan_days").delete().eq("id", planDayId);
  if (err) return { error: err.message };
  revalidatePath("/schedule");
  return { error: null };
}

// ─── Copy this month's plan to next month ─────────────────────────────────────

export async function copyPlanToNextMonth(sourcePlanId: string) {
  const { error, supabase, user } = await requireScheduleAdmin();
  if (error || !supabase || !user) return { error };

  const { data: sourcePlan } = await supabase
    .from("schedule_plans").select("plan_month").eq("id", sourcePlanId).single();
  if (!sourcePlan) return { error: "Source plan not found" };

  const src = new Date(sourcePlan.plan_month + "T00:00:00Z");
  const next = new Date(Date.UTC(src.getUTCFullYear(), src.getUTCMonth() + 1, 1));
  const nextMonth = next.toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("schedule_plans").select("id").eq("plan_month", nextMonth).maybeSingle();
  if (existing) return { error: "Next month already has a plan" };

  const { data: newPlan, error: planErr } = await supabase
    .from("schedule_plans")
    .insert({ plan_month: nextMonth, created_by: user.id })
    .select()
    .single();
  if (planErr || !newPlan) return { error: planErr?.message ?? "Failed to create plan" };

  const cloneResult = await cloneDaysToNewPlan(supabase, sourcePlanId, newPlan.id);
  if (cloneResult.error) return { error: cloneResult.error };

  revalidatePath("/schedule");
  return { error: null, plan: newPlan };
}

// ─── Per-date overrides ────────────────────────────────────────────────────────

export async function upsertOverride(
  date: string, zoneId: string,
  opts: { driverId?: string | null; timeSlotId?: string | null; isSkipped?: boolean; note?: string }
) {
  const { error, supabase, user } = await requireScheduleAdmin();
  if (error || !supabase || !user) return { error };

  const today = new Date().toISOString().split("T")[0];
  if (date < today) return { error: "Cannot set an override for a date that has already passed" };

  const { data, error: err } = await supabase
    .from("schedule_overrides")
    .upsert(
      {
        override_date: date, zone_id: zoneId,
        driver_id: opts.driverId ?? null, time_slot_id: opts.timeSlotId ?? null,
        is_skipped: opts.isSkipped ?? false,
        note: opts.note ?? null, created_by: user.id,
      },
      { onConflict: "override_date,zone_id" }
    )
    .select()
    .single();

  if (err) return { error: err.message };
  revalidatePath("/schedule");
  return { error: null, override: data };
}

export async function deleteOverride(overrideId: string) {
  const { error, supabase } = await requireScheduleAdmin();
  if (error || !supabase) return { error };

  const { error: err } = await supabase.from("schedule_overrides").delete().eq("id", overrideId);
  if (err) return { error: err.message };
  revalidatePath("/schedule");
  return { error: null };
}

// ─── Resolved preview for a specific date (admin-facing sanity check) ─────────

export async function getResolvedScheduleForDate(date: string) {
  const { error, supabase } = await requireScheduleAdmin();
  if (error || !supabase) return { error, resolved: [] };

  const { data: zones } = await supabase
    .from("delivery_zones").select("id, name").eq("is_active", true);

  const resolved = await Promise.all(
    (zones ?? []).map(async (z) => {
      const { data: driverId } = await supabase.rpc("resolve_zone_driver", { p_date: date, p_zone_id: z.id });
      return { zone_id: z.id, zone_name: z.name, driver_id: driverId as string | null };
    })
  );

  return { error: null, resolved };
}
