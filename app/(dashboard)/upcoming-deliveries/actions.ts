"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDueCustomers } from "@/lib/delivery-projection";

async function requireViewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", user: null, role: null as string | null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", user: null, role: null as string | null };
  }
  return { error: null, user, role: profile!.role as string };
}

export interface UpcomingStop {
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  zone_id: string | null;
  driver_id: string | null;
  time_slot_id: string | null;
  time_slot_label: string | null;
  payment_method_snapshot: "cash" | "monthly";
}

export interface UpcomingDay {
  date: string;
  stops: UpcomingStop[];
}

// Live, read-only projection — distinct from the materialized delivery_stops
// table (Stage 3). Days that haven't happened yet aren't persisted, so
// schedule/preference edits are reflected immediately without needing to
// mutate rows that shouldn't exist until they become "today". Runs via the
// admin client (read-only computation, same as the Stage 3 materializer),
// then results are scoped down to the caller's own driver_id for
// delivery_person — never sent to the client unfiltered, per the "limited
// access" decision for that role.
export async function getUpcomingProjection(days = 7): Promise<{ error: string | null; upcoming: UpcomingDay[] }> {
  const { error, user, role } = await requireViewer();
  if (error || !user) return { error, upcoming: [] };

  const admin = createAdminClient();
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const perDay = await Promise.all(dates.map((date) => computeDueCustomers(admin, date)));

  const allCustomerIds = Array.from(new Set(perDay.flat().map((s) => s.customer_id)));
  const allTimeSlotIds = Array.from(new Set(perDay.flat().map((s) => s.time_slot_id).filter((x): x is string => !!x)));
  const [{ data: profiles }, { data: timeSlots }] = await Promise.all([
    allCustomerIds.length > 0
      ? admin.from("profiles").select("id, full_name, phone").in("id", allCustomerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null }[] }),
    allTimeSlotIds.length > 0
      ? admin.from("time_slots").select("id, label").in("id", allTimeSlotIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const timeSlotMap = new Map((timeSlots ?? []).map((t) => [t.id, t.label]));

  const upcoming: UpcomingDay[] = dates.map((date, i) => {
    let due = perDay[i];
    if (role === "delivery_person") due = due.filter((d) => d.driver_id === user.id);
    return {
      date,
      stops: due.map((d) => ({
        customer_id: d.customer_id,
        customer_name: profileMap.get(d.customer_id)?.full_name ?? "Unknown",
        customer_phone: profileMap.get(d.customer_id)?.phone ?? null,
        zone_id: d.zone_id,
        driver_id: d.driver_id,
        time_slot_id: d.time_slot_id,
        time_slot_label: d.time_slot_id ? (timeSlotMap.get(d.time_slot_id) ?? null) : null,
        payment_method_snapshot: d.payment_method_snapshot,
      })),
    };
  });

  return { error: null, upcoming };
}
