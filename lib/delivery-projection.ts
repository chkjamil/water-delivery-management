import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the Stage 3 delivery-stop materializer (my-stops/actions.ts) and the
// Stage 5 upcoming-deliveries preview — both must agree on "who's due on date D"
// so they can never drift from each other.

interface DeliveryPreferenceRow {
  customer_id: string;
  frequency: "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  days_of_month: number[];
  biweekly_anchor_date: string | null;
  address_id: string | null;
}

export interface ProjectedStopItem {
  product_id: string;
  planned_qty: number;
  unit_price: number;
}

export interface ProjectedStop {
  customer_id: string;
  address_id: string | null;
  zone_id: string | null;
  driver_id: string | null;
  time_slot_id: string | null;
  payment_method_snapshot: "cash" | "monthly";
  items: ProjectedStopItem[];
}

const MS_PER_DAY = 86_400_000;

// day-of-month is clamped to the month's last day (e.g. 31 -> Feb 28/29), so a
// customer scheduled for the 31st is never silently skipped in short months.
function lastDayOfMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function matchesFrequency(pref: DeliveryPreferenceRow, date: Date): boolean {
  if (pref.frequency === "weekly" || pref.frequency === "biweekly") {
    if (!pref.days_of_week.includes(date.getUTCDay())) return false;
    if (pref.frequency === "weekly") return true;

    if (!pref.biweekly_anchor_date) return false;
    const anchor = new Date(pref.biweekly_anchor_date + "T00:00:00Z");
    // Explicit floor(), not JS/Postgres truncate-toward-zero division, so parity
    // is computed correctly for dates before the anchor too.
    const diffDays = Math.floor((date.getTime() - anchor.getTime()) / MS_PER_DAY);
    const diffWeeks = Math.floor(diffDays / 7);
    return ((diffWeeks % 2) + 2) % 2 === 0;
  }

  // monthly
  const lastDay = lastDayOfMonth(date);
  const dom = date.getUTCDate();
  return pref.days_of_month.some((d) => Math.min(d, lastDay) === dom);
}

export async function computeDueCustomers(
  supabase: SupabaseClient, date: string
): Promise<ProjectedStop[]> {
  const d = new Date(date + "T00:00:00Z");

  const { data: prefs } = await supabase
    .from("customer_delivery_preferences")
    .select("customer_id, frequency, days_of_week, days_of_month, biweekly_anchor_date, address_id")
    .eq("is_active", true);

  const due = ((prefs ?? []) as DeliveryPreferenceRow[]).filter((p) => matchesFrequency(p, d));
  if (due.length === 0) return [];

  const customerIds = Array.from(new Set(due.map((p) => p.customer_id)));
  const explicitAddressIds = Array.from(new Set(due.map((p) => p.address_id).filter((x): x is string => !!x)));

  const [customersRes, explicitAddrRes, defaultAddrRes, standingItemsRes] = await Promise.all([
    supabase.from("customers").select("id, payment_method_preference").in("id", customerIds),
    explicitAddressIds.length > 0
      ? supabase.from("customer_addresses").select("id, customer_id, zone_id").in("id", explicitAddressIds)
      : Promise.resolve({ data: [] as { id: string; customer_id: string; zone_id: string | null }[] }),
    supabase.from("customer_addresses").select("id, customer_id, zone_id").in("customer_id", customerIds).eq("is_default", true),
    supabase.from("customer_standing_items").select("customer_id, product_id, quantity, product:products(price)").in("customer_id", customerIds),
  ]);

  const payMap = new Map((customersRes.data ?? []).map((c: any) => [c.id, c.payment_method_preference]));
  const explicitAddrMap = new Map((explicitAddrRes.data ?? []).map((a: any) => [a.id, a]));
  const defaultAddrMap = new Map((defaultAddrRes.data ?? []).map((a: any) => [a.customer_id, a]));
  const itemsByCustomer = new Map<string, ProjectedStopItem[]>();
  for (const si of (standingItemsRes.data ?? []) as any[]) {
    const product = Array.isArray(si.product) ? si.product[0] : si.product;
    const list = itemsByCustomer.get(si.customer_id) ?? [];
    list.push({ product_id: si.product_id, planned_qty: si.quantity, unit_price: product?.price ?? 0 });
    itemsByCustomer.set(si.customer_id, list);
  }

  // Resolve each unique zone once (not once per customer) to minimize RPC round-trips.
  const zoneIds = new Set<string>();
  for (const pref of due) {
    const addr = pref.address_id ? explicitAddrMap.get(pref.address_id) : defaultAddrMap.get(pref.customer_id);
    if (addr?.zone_id) zoneIds.add(addr.zone_id);
  }
  const zoneAssignmentEntries = await Promise.all(
    Array.from(zoneIds).map(async (zoneId) => {
      const { data } = await supabase.rpc("resolve_zone_assignment", { p_date: date, p_zone_id: zoneId });
      const row = (Array.isArray(data) ? data[0] : data) as { driver_id: string | null; time_slot_id: string | null } | null;
      return [zoneId, { driverId: row?.driver_id ?? null, timeSlotId: row?.time_slot_id ?? null }] as const;
    })
  );
  const zoneAssignmentMap = new Map(zoneAssignmentEntries);

  const projected = due.map((pref) => {
    const addr = pref.address_id ? explicitAddrMap.get(pref.address_id) : defaultAddrMap.get(pref.customer_id);
    const zoneId: string | null = addr?.zone_id ?? null;
    const assignment = zoneId ? zoneAssignmentMap.get(zoneId) : null;
    return {
      customer_id: pref.customer_id,
      address_id: addr?.id ?? null,
      zone_id: zoneId,
      driver_id: assignment?.driverId ?? null,
      time_slot_id: assignment?.timeSlotId ?? null,
      payment_method_snapshot: (payMap.get(pref.customer_id) as "cash" | "monthly") ?? "cash",
      items: itemsByCustomer.get(pref.customer_id) ?? [],
    };
  });

  // No resolved driver = that zone has no coverage this date (a blank cell in the
  // weekly schedule, or an address with no zone at all) — treat as a genuine day
  // off rather than generating an orphaned stop nobody will ever see.
  return projected.filter((p) => p.driver_id !== null);
}
