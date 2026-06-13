"use client";

import { useState, useTransition } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { adjustStock } from "../actions";
import toast from "react-hot-toast";
import type { InventoryProduct, TransactionRow } from "./InventoryClient";

interface Props {
  product: InventoryProduct;
  onClose: () => void;
  onSaved: (updated: InventoryProduct, tx: TransactionRow) => void;
}

const REASONS = [
  "Physical count correction",
  "Damaged / broken units",
  "Theft / loss",
  "Returned to supplier",
  "Other",
];

export default function AdjustStockModal({ product, onClose, onSaved }: Props) {
  const currentStock = product.inventory?.quantity_in_stock ?? 0;

  const [newQty,   setNewQty]   = useState(currentStock);
  const [reason,   setReason]   = useState("");
  const [custom,   setCustom]   = useState("");
  const [isPending, start]      = useTransition();

  const diff    = newQty - currentStock;
  const diffAbs = Math.abs(diff);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalReason = reason === "Other" ? custom.trim() : reason;
    if (!finalReason) { toast.error("Please provide a reason"); return; }
    if (newQty < 0)   { toast.error("Stock cannot be negative"); return; }

    start(async () => {
      const result = await adjustStock({ product_id: product.id, new_quantity: newQty, reason: finalReason });
      if (result.error) { toast.error(result.error); return; }

      toast.success("Stock adjusted");

      const updated: InventoryProduct = {
        ...product,
        inventory: product.inventory
          ? { ...product.inventory, quantity_in_stock: newQty }
          : null,
      };

      const tx: TransactionRow = {
        id:               crypto.randomUUID(),
        transaction_type: "adjustment",
        quantity:         newQty,
        note:             `Adjustment: ${finalReason}`,
        created_at:       new Date().toISOString(),
        product:          { id: product.id, name: product.name, sku: product.sku, size_label: product.size_label },
        performed_by_profile: null,
      };

      onSaved(updated, tx);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Adjust Stock</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Product info */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">💧</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
              <p className="text-xs text-slate-400">{product.sku} · {product.size_label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-400">Current stock</p>
              <p className="text-lg font-bold text-slate-800">{currentStock}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">

            <div>
              <label className="label">Set New Stock Quantity <span className="text-red-500">*</span></label>
              <input
                className="input text-center text-xl font-bold"
                type="number"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(parseInt(e.target.value) ?? 0)}
                autoFocus
                required
              />
              {newQty !== currentStock && (
                <p className={`text-xs mt-1.5 px-3 py-1.5 rounded-lg text-center font-medium ${
                  diff > 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                }`}>
                  {diff > 0 ? `▲ Increasing by ${diffAbs} units` : `▼ Decreasing by ${diffAbs} units`}
                </p>
              )}
            </div>

            <div>
              <label className="label">Reason <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-brand-600"
                    />
                    <span className="text-sm text-slate-700">{r}</span>
                  </label>
                ))}
              </div>
              {reason === "Other" && (
                <input
                  className="input mt-2"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Describe the reason…"
                  autoFocus
                  required
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending || !reason || newQty === currentStock}
            >
              {isPending ? "Saving…" : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
