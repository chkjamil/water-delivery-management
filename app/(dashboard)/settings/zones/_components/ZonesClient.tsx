"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, MapPin, Check, X } from "lucide-react";
import { upsertZone, deleteZone } from "../actions";
import toast from "react-hot-toast";
import type { DeliveryZone } from "@/types";

export default function ZonesClient({ initialZones }: { initialZones: DeliveryZone[] }) {
  const [zones, setZones]       = useState<DeliveryZone[]>(initialZones);
  const [editing, setEditing]   = useState<string | null>(null);   // zone id or "new"
  const [form, setForm]         = useState({ name: "", delivery_fee: "" });
  const [isPending, start]      = useTransition();

  function openNew() {
    setEditing("new");
    setForm({ name: "", delivery_fee: "0" });
  }

  function openEdit(z: DeliveryZone) {
    setEditing(z.id);
    setForm({ name: z.name, delivery_fee: String(z.delivery_fee) });
  }

  function cancel() { setEditing(null); setForm({ name: "", delivery_fee: "" }); }

  function handleSave() {
    if (!form.name.trim()) { toast.error("Zone name is required"); return; }
    start(async () => {
      const result = await upsertZone({
        id:           editing === "new" ? undefined : editing!,
        name:         form.name.trim(),
        delivery_fee: parseFloat(form.delivery_fee) || 0,
      });
      if (result.error) { toast.error(result.error); return; }
      if (result.zone) {
        if (editing === "new") {
          setZones((z) => [...z, result.zone!]);
        } else {
          setZones((z) => z.map((x) => x.id === result.zone!.id ? result.zone! : x));
        }
      }
      toast.success(editing === "new" ? "Zone added!" : "Zone updated!");
      cancel();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this zone? Orders using it will keep their zone reference.")) return;
    start(async () => {
      const result = await deleteZone(id);
      if (result.error) { toast.error(result.error); return; }
      setZones((z) => z.filter((x) => x.id !== id));
      toast.success("Zone deleted");
    });
  }

  function handleToggleActive(zone: DeliveryZone) {
    start(async () => {
      const result = await upsertZone({ ...zone, delivery_fee: zone.delivery_fee, is_active: !zone.is_active });
      if (result.error) { toast.error(result.error); return; }
      if (result.zone) setZones((z) => z.map((x) => x.id === result.zone!.id ? result.zone! : x));
    });
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Delivery Zones</h3>
            <span className="badge bg-slate-100 text-slate-600 ml-1">{zones.length}</span>
          </div>
          <button onClick={openNew} className="btn-primary btn-sm" disabled={isPending}>
            <Plus size={14} /> Add Zone
          </button>
        </div>

        {/* Add / Edit inline form */}
        {editing && (
          <div className="px-5 py-4 bg-brand-50 border-b border-brand-100">
            <p className="text-sm font-semibold text-brand-700 mb-3">
              {editing === "new" ? "New Delivery Zone" : "Edit Zone"}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="label">Zone Name</label>
                <input className="input" placeholder="e.g. F-6, DHA Phase 2"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus />
              </div>
              <div className="w-36">
                <label className="label">Delivery Fee (PKR)</label>
                <input className="input" type="number" min="0" step="1"
                  value={form.delivery_fee}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_fee: e.target.value }))} />
              </div>
              <div className="flex gap-2 pb-0.5">
                <button onClick={handleSave} className="btn-primary btn-sm" disabled={isPending}>
                  <Check size={14} /> {isPending ? "Saving…" : "Save"}
                </button>
                <button onClick={cancel} className="btn-secondary btn-sm">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card-body p-0">
          {zones.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <MapPin size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No delivery zones yet. Add your first zone.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{zone.name}</p>
                      {!zone.is_active && (
                        <span className="badge bg-slate-100 text-slate-500 text-xs">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Delivery fee: <span className="font-medium text-slate-700">PKR {zone.delivery_fee}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(zone)}
                      title={zone.is_active ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${zone.is_active ? "bg-brand-600" : "bg-slate-200"}`}
                      disabled={isPending}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${zone.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <button onClick={() => openEdit(zone)} className="btn-ghost btn-sm p-1.5" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(zone.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
