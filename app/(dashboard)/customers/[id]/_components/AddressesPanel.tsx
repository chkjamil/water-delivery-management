"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, Pencil, Trash2, Check, X, Star } from "lucide-react";
import { addCustomerAddress, updateCustomerAddress, deleteCustomerAddress } from "../../actions";
import toast from "react-hot-toast";
import type { DeliveryZone } from "@/types";

interface AddressRow {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  zone_id: string | null;
  is_default: boolean;
}

const EMPTY_FORM = { label: "", address_line1: "", address_line2: "", city: "", zone_id: "", is_default: false };

export default function AddressesPanel({
  customerId, initialAddresses, zones,
}: { customerId: string; initialAddresses: AddressRow[]; zones: DeliveryZone[] }) {
  const [addresses, setAddresses] = useState<AddressRow[]>(initialAddresses);
  const [editing, setEditing]     = useState<string | null>(null); // address id or "new"
  const [form, setForm]           = useState(EMPTY_FORM);
  const [isPending, start]        = useTransition();

  function openNew() { setEditing("new"); setForm(EMPTY_FORM); }
  function openEdit(a: AddressRow) {
    setEditing(a.id);
    setForm({
      label: a.label, address_line1: a.address_line1, address_line2: a.address_line2 ?? "",
      city: a.city, zone_id: a.zone_id ?? "", is_default: a.is_default,
    });
  }
  function cancel() { setEditing(null); setForm(EMPTY_FORM); }

  function handleSave() {
    if (!form.label.trim() || !form.address_line1.trim() || !form.city.trim()) {
      toast.error("Label, address and city are required");
      return;
    }
    const input = {
      label: form.label.trim(),
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim(),
      zone_id: form.zone_id || undefined,
      is_default: form.is_default,
    };
    start(async () => {
      if (editing === "new") {
        const result = await addCustomerAddress(customerId, input);
        if (result.error) { toast.error(result.error); return; }
        setAddresses((prev) => {
          const next = input.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev;
          return [...next, result.address as AddressRow];
        });
        toast.success("Address added");
      } else {
        const result = await updateCustomerAddress(customerId, editing!, input);
        if (result.error) { toast.error(result.error); return; }
        setAddresses((prev) => prev.map((a) => {
          if (a.id === editing) return { ...a, ...input, address_line2: input.address_line2 ?? null, zone_id: input.zone_id ?? null };
          return input.is_default ? { ...a, is_default: false } : a;
        }));
        toast.success("Address updated");
      }
      cancel();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    start(async () => {
      const result = await deleteCustomerAddress(customerId, id);
      if (result.error) { toast.error(result.error); return; }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address deleted");
    });
  }

  function handleSetDefault(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    start(async () => {
      const result = await updateCustomerAddress(customerId, id, {
        label: a.label, address_line1: a.address_line1, address_line2: a.address_line2 ?? undefined,
        city: a.city, zone_id: a.zone_id ?? undefined, is_default: true,
      });
      if (result.error) { toast.error(result.error); return; }
      setAddresses((prev) => prev.map((x) => ({ ...x, is_default: x.id === id })));
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <MapPin size={15} className="text-brand-600" /> Delivery Addresses
        </h2>
        <button onClick={openNew} className="btn-primary btn-sm" disabled={isPending}>
          <Plus size={14} /> Add
        </button>
      </div>

      {editing && (
        <div className="px-5 py-4 bg-brand-50 border-b border-brand-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Label</label>
              <input className="input" placeholder="Home, Office…" autoFocus
                value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Address Line 1</label>
            <input className="input" value={form.address_line1} onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))} />
          </div>
          <div>
            <label className="label">Address Line 2</label>
            <input className="input" value={form.address_line2} onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Zone</label>
              <select className="input" value={form.zone_id} onChange={(e) => setForm((f) => ({ ...f, zone_id: e.target.value }))}>
                <option value="">— No zone —</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2.5">
              <input type="checkbox" checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} />
              Set as default
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary btn-sm" disabled={isPending}>
              <Check size={14} /> {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="btn-secondary btn-sm"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card-body p-0">
        {addresses.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {addresses.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">{a.label}</span>
                    {a.is_default && <span className="badge bg-brand-100 text-brand-700 text-xs">Default</span>}
                  </div>
                  <p className="text-sm text-slate-600">{a.address_line1}</p>
                  {a.address_line2 && <p className="text-xs text-slate-400">{a.address_line2}</p>}
                  <p className="text-xs text-slate-400">{a.city}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!a.is_default && (
                    <button onClick={() => handleSetDefault(a.id)} title="Set default" className="btn-ghost btn-sm p-1.5" disabled={isPending}>
                      <Star size={14} />
                    </button>
                  )}
                  <button onClick={() => openEdit(a)} title="Edit" className="btn-ghost btn-sm p-1.5"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(a.id)}
                    title={addresses.length <= 1 ? "A customer must have at least one address" : "Delete"}
                    className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    disabled={isPending || addresses.length <= 1}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-400">No addresses saved</p>
        )}
      </div>
    </div>
  );
}
