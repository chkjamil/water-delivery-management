"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, ChevronLeft, ChevronRight, Copy, Plus, Trash2, Ban } from "lucide-react";
import toast from "react-hot-toast";
import {
  getOrCreatePlan, upsertPlanDay, deletePlanDay, copyPlanToNextMonth,
  upsertOverride, deleteOverride,
} from "../actions";
import type { DeliveryZone, SchedulePlan, SchedulePlanDay, ScheduleOverride, TimeSlot } from "@/types";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DriverOption { id: string; full_name: string; phone: string | null; }

function isPastMonth(planMonth: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return planMonth < currentMonth;
}

function shiftMonth(planMonth: string, delta: number) {
  const d = new Date(planMonth + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().split("T")[0];
}

export default function ScheduleClient({
  planMonth, initialPlan, initialPlanDays, initialOverrides, zones, drivers, timeSlots,
}: {
  planMonth: string;
  initialPlan: SchedulePlan | null;
  initialPlanDays: SchedulePlanDay[];
  initialOverrides: ScheduleOverride[];
  zones: DeliveryZone[];
  drivers: DriverOption[];
  timeSlots: TimeSlot[];
}) {
  const router = useRouter();
  const [plan, setPlan]           = useState(initialPlan);
  const [planDays, setPlanDays]   = useState(initialPlanDays);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [isPending, start]        = useTransition();
  const [overrideForm, setOverrideForm] = useState({ date: "", zone_id: "", driver_id: "", time_slot_id: "", is_skipped: false });
  const [bulkForm, setBulkForm]   = useState<Record<string, { driver_id: string; time_slot_id: string }>>({});

  const locked = isPastMonth(planMonth);
  const monthLabel = new Date(planMonth + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  function timeSlotLabel(id: string | null) {
    if (!id) return null;
    return timeSlots.find((t) => t.id === id)?.label ?? null;
  }

  function goToMonth(m: string) {
    router.push(`/schedule?month=${m}`);
  }

  function handleCreatePlan() {
    start(async () => {
      const result = await getOrCreatePlan(planMonth);
      if (result.error) { toast.error(result.error); return; }
      setPlan(result.plan);
      if (result.clonedFromPrevious) {
        setPlanDays(result.planDays as SchedulePlanDay[]);
        toast.success("Continued from last month's plan — review before it takes effect", { duration: 5000 });
      } else {
        toast.success("Plan created — assign drivers below");
      }
    });
  }

  function cellDay(zoneId: string, dow: number) {
    return planDays.find((d) => d.zone_id === zoneId && d.day_of_week === dow);
  }

  function handleCellUpdate(zoneId: string, dow: number, driverId: string | null, timeSlotId: string | null) {
    if (!plan) return;
    start(async () => {
      if (!driverId) {
        const existing = cellDay(zoneId, dow);
        if (existing) {
          const result = await deletePlanDay(existing.id);
          if (result.error) { toast.error(result.error); return; }
          setPlanDays((prev) => prev.filter((d) => d.id !== existing.id));
        }
        return;
      }
      const result = await upsertPlanDay(plan.id, dow, zoneId, driverId, timeSlotId);
      if (result.error) { toast.error(result.error); return; }
      setPlanDays((prev) => {
        const without = prev.filter((d) => !(d.zone_id === zoneId && d.day_of_week === dow));
        return [...without, result.planDay!];
      });
    });
  }

  function handleDriverChange(zoneId: string, dow: number, driverId: string) {
    const currentSlot = cellDay(zoneId, dow)?.time_slot_id ?? null;
    handleCellUpdate(zoneId, dow, driverId || null, currentSlot);
  }

  function handleSlotChange(zoneId: string, dow: number, timeSlotId: string) {
    const currentDriver = cellDay(zoneId, dow)?.driver_id ?? null;
    handleCellUpdate(zoneId, dow, currentDriver, timeSlotId || null);
  }

  function handleBulkAssign(zoneId: string) {
    if (!plan) return;
    const { driver_id, time_slot_id } = bulkForm[zoneId] ?? { driver_id: "", time_slot_id: "" };
    if (!driver_id) { toast.error("Pick a driver first"); return; }
    start(async () => {
      const results = await Promise.all(
        DOW_LABELS.map((_, dow) => upsertPlanDay(plan.id, dow, zoneId, driver_id, time_slot_id || null))
      );
      const failed = results.find((r) => r.error);
      if (failed) { toast.error(failed.error!); return; }
      setPlanDays((prev) => {
        const withoutZone = prev.filter((d) => d.zone_id !== zoneId);
        const newDays = results.map((r) => r.planDay!);
        return [...withoutZone, ...newDays];
      });
      toast.success("Set for the whole week");
    });
  }

  function handleCopyToNextMonth() {
    if (!plan) return;
    start(async () => {
      const result = await copyPlanToNextMonth(plan.id);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Copied to next month");
      goToMonth(shiftMonth(planMonth, 1));
    });
  }

  function handleAddOverride() {
    if (!overrideForm.date || !overrideForm.zone_id) { toast.error("Pick a date and zone"); return; }
    start(async () => {
      const result = await upsertOverride(overrideForm.date, overrideForm.zone_id, {
        driverId: overrideForm.is_skipped ? null : (overrideForm.driver_id || null),
        timeSlotId: overrideForm.is_skipped ? null : (overrideForm.time_slot_id || null),
        isSkipped: overrideForm.is_skipped,
      });
      if (result.error) { toast.error(result.error); return; }
      setOverrides((prev) => [...prev.filter((o) => o.id !== result.override!.id), result.override!]);
      setOverrideForm({ date: "", zone_id: "", driver_id: "", time_slot_id: "", is_skipped: false });
      toast.success("Override saved");
    });
  }

  function handleDeleteOverride(id: string) {
    start(async () => {
      const result = await deleteOverride(id);
      if (result.error) { toast.error(result.error); return; }
      setOverrides((prev) => prev.filter((o) => o.id !== id));
    });
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-brand-600" />
            <h1 className="font-semibold text-slate-800">Delivery Schedule</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => goToMonth(shiftMonth(planMonth, -1))} className="btn-secondary btn-sm p-1.5"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium text-slate-700 w-36 text-center">{monthLabel}</span>
            <button onClick={() => goToMonth(shiftMonth(planMonth, 1))} className="btn-secondary btn-sm p-1.5"><ChevronRight size={14} /></button>
          </div>
        </div>

        {locked && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This month has already passed — the plan is read-only.
          </p>
        )}

        {!plan ? (
          <div className="mt-6 text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No plan exists for {monthLabel} yet.</p>
            {!locked && (
              <button onClick={handleCreatePlan} className="btn-primary btn-sm" disabled={isPending}>
                <Plus size={14} /> Create Plan
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-semibold uppercase">Zone</th>
                    <th className="px-3 py-2 text-xs text-slate-500 font-semibold uppercase whitespace-nowrap">Whole Week</th>
                    {DOW_LABELS.map((label) => (
                      <th key={label} className="px-3 py-2 text-xs text-slate-500 font-semibold uppercase">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zones.map((zone) => {
                    const bulk = bulkForm[zone.id] ?? { driver_id: "", time_slot_id: "" };
                    return (
                      <tr key={zone.id}>
                        <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap align-top">{zone.name}</td>
                        <td className="px-2 py-2 align-top">
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <select
                              className="input text-xs py-1"
                              value={bulk.driver_id}
                              disabled={locked || isPending}
                              onChange={(e) => setBulkForm((f) => ({ ...f, [zone.id]: { ...bulk, driver_id: e.target.value } }))}
                            >
                              <option value="">Driver…</option>
                              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                            </select>
                            <select
                              className="input text-xs py-1"
                              value={bulk.time_slot_id}
                              disabled={locked || isPending}
                              onChange={(e) => setBulkForm((f) => ({ ...f, [zone.id]: { ...bulk, time_slot_id: e.target.value } }))}
                            >
                              <option value="">Slot…</option>
                              {timeSlots.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                            <button
                              type="button" onClick={() => handleBulkAssign(zone.id)}
                              disabled={locked || isPending} className="btn-secondary text-xs py-1"
                              title="Apply to all 7 days for this zone"
                            >
                              Set week
                            </button>
                          </div>
                        </td>
                        {DOW_LABELS.map((_, dow) => {
                          const day = cellDay(zone.id, dow);
                          return (
                            <td key={dow} className="px-2 py-2 align-top">
                              <div className="flex flex-col gap-1 min-w-[110px]">
                                <select
                                  className="input text-xs py-1"
                                  value={day?.driver_id ?? ""}
                                  disabled={locked || isPending}
                                  onChange={(e) => handleDriverChange(zone.id, dow, e.target.value)}
                                >
                                  <option value="">—</option>
                                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                                <select
                                  className="input text-xs py-1"
                                  value={day?.time_slot_id ?? ""}
                                  disabled={locked || isPending || !day?.driver_id}
                                  onChange={(e) => handleSlotChange(zone.id, dow, e.target.value)}
                                  title={!day?.driver_id ? "Pick a driver first" : undefined}
                                >
                                  <option value="">Slot…</option>
                                  {timeSlots.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {zones.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400 text-sm">No active delivery zones. Add zones in Settings first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <button onClick={handleCopyToNextMonth} className="btn-secondary btn-sm" disabled={isPending}>
                <Copy size={14} /> Copy This Plan to Next Month
              </button>
            </div>
          </>
        )}
      </div>

      {/* Per-date overrides */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 text-sm mb-3">Date-Specific Overrides</h2>
        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={overrideForm.date}
              onChange={(e) => setOverrideForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Zone</label>
            <select className="input" value={overrideForm.zone_id}
              onChange={(e) => setOverrideForm((f) => ({ ...f, zone_id: e.target.value }))}>
              <option value="">Select zone…</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Driver</label>
            <select className="input" value={overrideForm.driver_id} disabled={overrideForm.is_skipped}
              onChange={(e) => setOverrideForm((f) => ({ ...f, driver_id: e.target.value }))}>
              <option value="">— None —</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Time Slot</label>
            <select className="input" value={overrideForm.time_slot_id} disabled={overrideForm.is_skipped}
              onChange={(e) => setOverrideForm((f) => ({ ...f, time_slot_id: e.target.value }))}>
              <option value="">— None —</option>
              {timeSlots.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-2">
            <input type="checkbox" checked={overrideForm.is_skipped}
              onChange={(e) => setOverrideForm((f) => ({ ...f, is_skipped: e.target.checked }))} />
            Skip entirely
          </label>
          <button onClick={handleAddOverride} className="btn-primary btn-sm" disabled={isPending}>
            <Plus size={14} /> Add Override
          </button>
        </div>

        {overrides.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {overrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-slate-700">{o.override_date}</span>
                  {" — "}
                  {zones.find((z) => z.id === o.zone_id)?.name ?? "?"}
                  {": "}
                  {o.is_skipped ? (
                    <span className="text-red-600 inline-flex items-center gap-1"><Ban size={12} /> Skipped</span>
                  ) : (
                    <>
                      {drivers.find((d) => d.id === o.driver_id)?.full_name ?? "Unassigned"}
                      {timeSlotLabel(o.time_slot_id ?? null) && (
                        <span className="text-slate-400"> · {timeSlotLabel(o.time_slot_id ?? null)}</span>
                      )}
                    </>
                  )}
                </span>
                <button onClick={() => handleDeleteOverride(o.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No overrides for this month.</p>
        )}
      </div>
    </div>
  );
}
