"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, Check, X } from "lucide-react";
import { upsertSlot, deleteSlot } from "../actions";
import toast from "react-hot-toast";
import type { TimeSlot } from "@/types";

const EMPTY_FORM = { label: "", start_time: "09:00", end_time: "12:00", max_orders: "20" };

export default function TimeSlotsClient({ initialSlots }: { initialSlots: TimeSlot[] }) {
  const [slots, setSlots]     = useState<TimeSlot[]>(initialSlots);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [isPending, start]    = useTransition();

  function openNew()           { setEditing("new"); setForm(EMPTY_FORM); }
  function openEdit(s: TimeSlot) {
    setEditing(s.id);
    setForm({ label: s.label, start_time: s.start_time, end_time: s.end_time, max_orders: String(s.max_orders) });
  }
  function cancel()            { setEditing(null); setForm(EMPTY_FORM); }
  function field(k: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function handleSave() {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    if (form.start_time >= form.end_time) { toast.error("End time must be after start time"); return; }
    start(async () => {
      const result = await upsertSlot({
        id:         editing === "new" ? undefined : editing!,
        label:      form.label.trim(),
        start_time: form.start_time,
        end_time:   form.end_time,
        max_orders: parseInt(form.max_orders) || 20,
      });
      if (result.error) { toast.error(result.error); return; }
      if (result.slot) {
        setSlots((s) =>
          editing === "new" ? [...s, result.slot!] : s.map((x) => x.id === result.slot!.id ? result.slot! : x)
        );
      }
      toast.success(editing === "new" ? "Slot added!" : "Slot updated!");
      cancel();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this time slot?")) return;
    start(async () => {
      const result = await deleteSlot(id);
      if (result.error) { toast.error(result.error); return; }
      setSlots((s) => s.filter((x) => x.id !== id));
      toast.success("Slot deleted");
    });
  }

  function handleToggle(slot: TimeSlot) {
    start(async () => {
      const result = await upsertSlot({ ...slot, is_active: !slot.is_active });
      if (result.error) { toast.error(result.error); return; }
      if (result.slot) setSlots((s) => s.map((x) => x.id === result.slot!.id ? result.slot! : x));
    });
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Delivery Time Slots</h3>
            <span className="badge bg-slate-100 text-slate-600 ml-1">{slots.filter(s=>s.is_active).length} active</span>
          </div>
          <button onClick={openNew} className="btn-primary btn-sm" disabled={isPending}>
            <Plus size={14} /> Add Slot
          </button>
        </div>

        {editing && (
          <div className="px-5 py-4 bg-brand-50 border-b border-brand-100">
            <p className="text-sm font-semibold text-brand-700 mb-3">
              {editing === "new" ? "New Time Slot" : "Edit Slot"}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="label">Label</label>
                <input className="input" placeholder="Morning (9am – 12pm)"
                  value={form.label} onChange={field("label")} autoFocus />
              </div>
              <div className="w-32">
                <label className="label">Start</label>
                <input className="input" type="time" value={form.start_time} onChange={field("start_time")} />
              </div>
              <div className="w-32">
                <label className="label">End</label>
                <input className="input" type="time" value={form.end_time} onChange={field("end_time")} />
              </div>
              <div className="w-28">
                <label className="label">Max Orders</label>
                <input className="input" type="number" min="1" max="500"
                  value={form.max_orders} onChange={field("max_orders")} />
              </div>
              <div className="flex gap-2 pb-0.5">
                <button onClick={handleSave} className="btn-primary btn-sm" disabled={isPending}>
                  <Check size={14} /> {isPending ? "Saving…" : "Save"}
                </button>
                <button onClick={cancel} className="btn-secondary btn-sm"><X size={14} /> Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="card-body p-0">
          {slots.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No time slots configured.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{slot.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {slot.start_time} – {slot.end_time}
                      &nbsp;·&nbsp;
                      <span className="font-medium text-slate-700">Max {slot.max_orders} orders</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(slot)} title={slot.is_active ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${slot.is_active ? "bg-brand-600" : "bg-slate-200"}`}
                      disabled={isPending}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${slot.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <button onClick={() => openEdit(slot)} className="btn-ghost btn-sm p-1.5"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(slot.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <strong>Tip:</strong> Customers choose from active time slots when placing an order. Deactivate slots to block bookings without deleting them.
      </div>
    </div>
  );
}
