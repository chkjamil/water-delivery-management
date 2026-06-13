"use client";

import { useState, useTransition } from "react";
import { X, RotateCcw } from "lucide-react";
import { recordBottleReturn } from "../actions";
import toast from "react-hot-toast";
import type { InventoryProduct, TransactionRow } from "./InventoryClient";

interface Props {
  product: InventoryProduct;
  onClose: () => void;
  onSaved: (updated: InventoryProduct, tx: TransactionRow) => void;
}

export default function BottleReturnModal({ product, onClose, onSaved }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote]         = useState("");
  const [isPending, start]      = useTransition();

  const currentReturned = product.inventory?.empty_bottles_returned ?? 0;
  const currentStock    = product.inventory?.quantity_in_stock ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity <= 0) { toast.error("Quantity must be greater than 0"); return; }

    start(async () => {
      const result = await recordBottleReturn({
        product_id: product.id,
        quantity,
        note,
      });
      if (result.error) { toast.error(result.error); return; }

      toast.success(`${quantity} empty bottle${quantity > 1 ? "s" : ""} recorded`);

      // Returned bottles go back into usable stock
      const updated: InventoryProduct = {
        ...product,
        inventory: product.inventory
          ? {
              ...product.inventory,
              quantity_in_stock:       currentStock + quantity,
              empty_bottles_returned:  currentReturned + quantity,
            }
          : null,
      };

      const tx: TransactionRow = {
        id:               crypto.randomUUID(),
        transaction_type: "return",
        quantity,
        note:             note.trim() || "Empty bottle return",
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
            <RotateCcw size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-800">Record Bottle Return</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Product info */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">🧴</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
              <p className="text-xs text-slate-400">{product.sku} · {product.size_label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-400">Total returned</p>
              <p className="text-lg font-bold text-purple-700">{currentReturned}</p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-3 text-xs text-purple-700 bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg">
          Empty bottles returned by customers are added back to usable stock automatically.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">

            <div>
              <label className="label">Number of Bottles Returned <span className="text-red-500">*</span></label>
              <input
                className="input text-center text-xl font-bold"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                autoFocus
                required
              />
              {quantity > 0 && (
                <p className="text-xs text-slate-500 mt-1.5 text-center">
                  Stock will increase from <strong>{currentStock}</strong> → <strong>{currentStock + quantity}</strong>
                </p>
              )}
            </div>

            {/* Quick-add buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(n)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    quantity === n
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Note (optional)</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Customer Ahmed — walk-in return"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn-primary bg-purple-600 hover:bg-purple-700"
              disabled={isPending || quantity <= 0}
            >
              {isPending ? "Saving…" : `Record ${quantity} Return${quantity > 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
