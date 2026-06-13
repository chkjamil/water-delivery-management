"use client";

import { useState, useTransition } from "react";
import { Clock, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TimeSlot {
  id:         string;
  label:      string;
  start_time: string;
  end_time:   string;
  max_orders: number;
  is_active:  boolean;
}

interface Props {
  slots: TimeSlot[];
}

export default function TimeSlotsCard({ slots: initial }: Props) {
  const [slots, setSlots] = useState(initial);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  function toggleSlot(id: string, current: boolean) {
    startTransition(async () => {
      await supabase.from("time_slots").update({ is_active: !current }).eq("id", id);
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s))
      );
    });
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold text-slate-800 text-base">Delivery Time Slots</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Toggle time slots customers can select when placing orders.
        </p>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              slot.is_active ? "border-brand-200 bg-brand-50/20" : "border-slate-200 bg-slate-50 opacity-60"
            }`}
          >
            <Clock size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">{slot.label}</p>
              <p className="text-xs text-slate-400">Max {slot.max_orders} orders</p>
            </div>
            <button
              onClick={() => toggleSlot(slot.id, slot.is_active)}
              disabled={pending}
              className="text-slate-400 hover:text-brand-600 transition-colors"
            >
              {pending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : slot.is_active ? (
                <ToggleRight size={24} className="text-brand-600" />
              ) : (
                <ToggleLeft size={24} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
