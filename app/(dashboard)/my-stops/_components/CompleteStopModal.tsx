"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Plus, Camera } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { completeStop } from "../actions";
import { captureLocation } from "@/lib/geolocation";
import toast from "react-hot-toast";
import type { MyStopRow } from "./MyStopsClient";

interface ProductOption { id: string; name: string; size_label: string; }

interface ItemRow {
  product_id: string;
  name: string;
  size_label: string;
  planned_qty: number;   // 0 for items the driver adds at the door (not on the standing order)
  actual_qty: number;
}

export default function CompleteStopModal({
  stop, products, onClose, onDone,
}: { stop: MyStopRow; products: ProductOption[]; onClose: () => void; onDone: () => void }) {
  const [items, setItems] = useState<ItemRow[]>(
    stop.items.map((it) => ({
      product_id: it.product_id,
      name: it.product?.name ?? "Item",
      size_label: it.product?.size_label ?? "",
      planned_qty: it.planned_qty,
      actual_qty: it.actual_qty ?? it.planned_qty,
    }))
  );
  const [addProductId, setAddProductId] = useState("");
  const [cashCollected, setCashCollected] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, start] = useTransition();

  const isMonthly = stop.payment_method_snapshot === "monthly";
  const availableToAdd = products.filter((p) => !items.some((i) => i.product_id === p.id));

  function updateQty(productId: string, qty: number) {
    setItems((prev) => prev.map((i) => i.product_id === productId ? { ...i, actual_qty: qty } : i));
  }

  function handleAddItem() {
    const product = products.find((p) => p.id === addProductId);
    if (!product) return;
    setItems((prev) => [...prev, { product_id: product.id, name: product.name, size_label: product.size_label, planned_qty: 0, actual_qty: 1 }]);
    setAddProductId("");
  }

  function handle() {
    start(async () => {
      const location = await captureLocation();
      const res = await completeStop(stop.id, {
        items: items.map((i) => ({ product_id: i.product_id, actual_qty: i.actual_qty })),
        cashCollected: isMonthly ? undefined : cashCollected,
        proof: {
          photo: photo ?? undefined,
          lat: location?.lat, lng: location?.lng, accuracy: location?.accuracy,
          locationAvailable: location !== null,
        },
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Delivery completed!");
      onDone();
      onClose();
    });
  }

  return (
    <Modal
      title={`Complete Delivery — ${stop.customer?.full_name ?? "Customer"}`}
      icon={<CheckCircle size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Confirm Delivery"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          Confirm the items actually delivered — adjust quantities if they differ from the usual order, or add anything extra below.
        </div>

        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.product_id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">{it.name}</p>
                  <p className="text-xs text-slate-400">
                    {it.size_label}
                    {it.planned_qty > 0 ? ` · usual: ${it.planned_qty}` : " · added now"}
                  </p>
                </div>
                <input type="number" min={0} className="input w-20 text-center"
                  value={it.actual_qty} onChange={(e) => updateQty(it.product_id, parseInt(e.target.value, 10) || 0)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No standing items for this customer yet — add what you delivered below.</p>
        )}

        {availableToAdd.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <select className="input flex-1 text-sm" value={addProductId} onChange={(e) => setAddProductId(e.target.value)}>
              <option value="">Add another item…</option>
              {availableToAdd.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.size_label})</option>)}
            </select>
            <button type="button" onClick={handleAddItem} disabled={!addProductId} className="btn-secondary btn-sm p-2">
              <Plus size={14} />
            </button>
          </div>
        )}

        {isMonthly ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            Monthly account — this delivery will be added to the customer's running balance.
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={cashCollected} onChange={(e) => setCashCollected(e.target.checked)} />
            Cash collected at delivery
          </label>
        )}

        <div className="pt-1 border-t border-slate-100">
          <label className="label flex items-center gap-1.5"><Camera size={13} /> Delivery Photo (optional)</label>
          <input type="file" accept="image/*" capture="environment" className="input text-sm"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {photo && <p className="text-xs text-green-600 mt-1">✓ {photo.name}</p>}
        </div>
      </div>
    </Modal>
  );
}
