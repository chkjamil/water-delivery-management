"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, AlertTriangle } from "lucide-react";
import { upsertDeliveryPreference, updatePaymentPreference, type DeliveryPreferenceInput } from "../../actions";
import toast from "react-hot-toast";
import type { PaymentMethodPreference } from "@/types";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AddressOption { id: string; label: string; zone_id: string | null; is_default: boolean; }

interface InitialPreference {
  frequency: "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  days_of_month: number[];
  biweekly_anchor_date: string | null;
  address_id: string | null;
  is_active: boolean;
}

export default function DeliveryPreferencePanel({
  customerId, initialPreference, initialPaymentPreference, addresses,
}: {
  customerId: string;
  initialPreference: InitialPreference | null;
  initialPaymentPreference: PaymentMethodPreference;
  addresses: AddressOption[];
}) {
  const [frequency, setFrequency]     = useState(initialPreference?.frequency ?? "weekly");
  const [daysOfWeek, setDaysOfWeek]   = useState<number[]>(initialPreference?.days_of_week ?? []);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(initialPreference?.days_of_month ?? []);
  const [anchorDate, setAnchorDate]   = useState(initialPreference?.biweekly_anchor_date ?? "");
  const [addressId, setAddressId]     = useState(initialPreference?.address_id ?? "");
  const [isActive, setIsActive]       = useState(initialPreference?.is_active ?? true);
  const [paymentPref, setPaymentPref] = useState<PaymentMethodPreference>(initialPaymentPreference);
  const [isPending, start]            = useTransition();

  const effectiveAddress = addressId
    ? addresses.find((a) => a.id === addressId)
    : addresses.find((a) => a.is_default) ?? addresses[0];
  const showZoneWarning = isActive && addresses.length > 0 && !effectiveAddress?.zone_id;

  function toggleDow(d: number) {
    if (daysOfWeek.includes(d)) { setDaysOfWeek(daysOfWeek.filter((x) => x !== d)); return; }
    if (daysOfWeek.length >= 2) { toast.error("Pick at most 2 days"); return; }
    setDaysOfWeek([...daysOfWeek, d].sort());
  }

  function toggleDom(d: number) {
    if (daysOfMonth.includes(d)) { setDaysOfMonth(daysOfMonth.filter((x) => x !== d)); return; }
    if (daysOfMonth.length >= 2) { toast.error("Pick at most 2 days"); return; }
    setDaysOfMonth([...daysOfMonth, d].sort((a, b) => a - b));
  }

  function handleSave() {
    if (frequency !== "monthly" && daysOfWeek.length === 0) {
      toast.error("Pick at least 1 day of the week"); return;
    }
    if (frequency === "monthly" && daysOfMonth.length === 0) {
      toast.error("Pick at least 1 day of the month"); return;
    }
    if (frequency === "biweekly" && !anchorDate) {
      toast.error("Biweekly needs a starting (anchor) date"); return;
    }

    const input: DeliveryPreferenceInput = {
      frequency,
      days_of_week: frequency === "monthly" ? [] : daysOfWeek,
      days_of_month: frequency === "monthly" ? daysOfMonth : [],
      biweekly_anchor_date: frequency === "biweekly" ? anchorDate : null,
      address_id: addressId || null,
      time_slot_id: null,
      is_active: isActive,
    };

    start(async () => {
      const [prefResult, payResult] = await Promise.all([
        upsertDeliveryPreference(customerId, input),
        updatePaymentPreference(customerId, paymentPref),
      ]);
      if (prefResult.error) { toast.error(prefResult.error); return; }
      if (payResult.error) { toast.error(payResult.error); return; }
      toast.success("Delivery schedule saved");
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <CalendarClock size={15} className="text-brand-600" /> Delivery Schedule
        </h2>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={paymentPref} onChange={(e) => setPaymentPref(e.target.value as PaymentMethodPreference)}>
              <option value="cash">Cash (pay at delivery)</option>
              <option value="monthly">Monthly account (bill later)</option>
            </select>
          </div>
        </div>

        {frequency !== "monthly" ? (
          <div>
            <label className="label">Delivery Day(s) — up to 2</label>
            <div className="flex flex-wrap gap-1.5">
              {DOW_LABELS.map((label, d) => (
                <button key={d} type="button" onClick={() => toggleDow(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    daysOfWeek.includes(d) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="label">Day(s) of Month — up to 2 (e.g. 1st &amp; 15th)</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button key={d} type="button" onClick={() => toggleDom(d)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    daysOfMonth.includes(d) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Days beyond a short month's end (e.g. 31 in Feb) are delivered on that month's last day.</p>
          </div>
        )}

        {frequency === "biweekly" && (
          <div>
            <label className="label">Starting From (anchor date)</label>
            <input type="date" className="input" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Delivery Address</label>
          <select className="input" value={addressId} onChange={(e) => setAddressId(e.target.value)}>
            <option value="">— Use default address —</option>
            {addresses.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {showZoneWarning && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              This address has no delivery zone — the schedule won't match a driver until one is set. Edit the address above to add one.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Schedule active
        </label>

        <button onClick={handleSave} className="btn-primary btn-sm" disabled={isPending}>
          <Check size={14} /> {isPending ? "Saving…" : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
