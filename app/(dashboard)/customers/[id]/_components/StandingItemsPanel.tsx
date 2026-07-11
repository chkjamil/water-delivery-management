"use client";

import { useState, useTransition } from "react";
import { Package, Plus, Trash2, Check } from "lucide-react";
import { upsertStandingItems } from "../../actions";
import toast from "react-hot-toast";

interface ProductOption { id: string; name: string; size_label: string; }
interface StandingItemRow { product_id: string; quantity: number; }

export default function StandingItemsPanel({
  customerId, initialItems, products,
}: { customerId: string; initialItems: StandingItemRow[]; products: ProductOption[] }) {
  const [items, setItems]     = useState<StandingItemRow[]>(initialItems);
  const [isPending, start]    = useTransition();

  function addRow() {
    const unused = products.find((p) => !items.some((i) => i.product_id === p.id));
    if (!unused) { toast.error("All products already added"); return; }
    setItems((prev) => [...prev, { product_id: unused.id, quantity: 1 }]);
  }

  function updateRow(index: number, patch: Partial<StandingItemRow>) {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, ...patch } : it));
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (items.some((i) => i.quantity <= 0)) { toast.error("Quantities must be greater than 0"); return; }
    start(async () => {
      const result = await upsertStandingItems(customerId, items);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Standing order saved");
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Package size={15} className="text-brand-600" /> Standing Order (usual items)
        </h2>
        <button onClick={addRow} className="btn-primary btn-sm"><Plus size={14} /> Add Item</button>
      </div>
      <div className="card-body space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400">No standing items — the delivery-person will pick items at the door.</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <select className="input flex-1" value={item.product_id}
              onChange={(e) => updateRow(i, { product_id: e.target.value })}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.size_label})</option>
              ))}
            </select>
            <input type="number" min={1} className="input w-20" value={item.quantity}
              onChange={(e) => updateRow(i, { quantity: parseInt(e.target.value, 10) || 1 })} />
            <button onClick={() => removeRow(i)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length > 0 && (
          <button onClick={handleSave} className="btn-primary btn-sm mt-2" disabled={isPending}>
            <Check size={14} /> {isPending ? "Saving…" : "Save Standing Order"}
          </button>
        )}
      </div>
    </div>
  );
}
