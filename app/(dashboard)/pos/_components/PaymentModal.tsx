"use client";

import { useState } from "react";
import { X, Banknote, CreditCard, Smartphone, Receipt } from "lucide-react";
import type { CartItem, POSCustomer } from "./POSClient";
import { clsx } from "clsx";

interface Props {
  cart:       CartItem[];
  customer:   POSCustomer | null;
  subtotal:   number;
  discount:   number;
  total:      number;
  isPending:  boolean;
  onClose:    () => void;
  onConfirm:  (input: {
    payment_method: "cash" | "credit" | "online";
    amount_paid:    number;
    note?:          string;
  }) => void;
}

type PaymentMethod = "cash" | "credit" | "online";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function PaymentModal({
  cart, customer, subtotal, discount, total, isPending, onClose, onConfirm,
}: Props) {
  const [method,     setMethod]     = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(total);
  const [note,       setNote]       = useState("");

  const change    = Math.max(0, amountPaid - total);
  const shortfall = amountPaid < total ? total - amountPaid : 0;

  function handleConfirm() {
    if (method === "cash" && amountPaid < total) return;
    onConfirm({
      payment_method: method,
      amount_paid:    method === "credit" ? 0 : amountPaid,
      note,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-brand-600" />
            <h3 className="font-bold text-slate-800">Payment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Order summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Summary</p>
              <div className="space-y-1.5">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.product.name}
                      <span className="text-slate-400"> × {item.quantity}</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      PKR {(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 pt-1 border-t border-slate-200">
                    <span>Discount</span>
                    <span>- PKR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>PKR {total.toLocaleString()}</span>
                </div>
              </div>
              {customer && (
                <p className="text-xs text-brand-700 mt-3 pt-3 border-t border-slate-200">
                  Customer: <strong>{customer.full_name}</strong>
                  {customer.balance > 0 && (
                    <span className="ml-2 text-red-500">(Outstanding: PKR {customer.balance.toLocaleString()})</span>
                  )}
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="label mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "cash"   as const, label: "Cash",   icon: <Banknote size={18} />     },
                  { value: "online" as const, label: "Online", icon: <Smartphone size={18} />   },
                  { value: "credit" as const, label: "Credit", icon: <CreditCard size={18} />,
                    disabled: !customer },
                ]).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    disabled={m.disabled}
                    onClick={() => { setMethod(m.value); if (m.value === "credit") setAmountPaid(0); else setAmountPaid(total); }}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors",
                      m.disabled && "opacity-40 cursor-not-allowed",
                      method === m.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
              {method === "credit" && (
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                  Balance will be added to {customer?.full_name}'s account. No upfront payment required.
                </p>
              )}
              {method === "credit" && !customer && (
                <p className="text-xs text-red-600 mt-1">Select a customer to use credit payment.</p>
              )}
            </div>

            {/* Cash amount */}
            {method !== "credit" && (
              <div>
                <label className="label">Amount Received (PKR)</label>
                <input
                  type="number"
                  min={0}
                  className="input text-xl font-bold text-center"
                  value={amountPaid || ""}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  autoFocus
                />

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(total)}
                    className={clsx(
                      "py-2 rounded-lg border text-xs font-medium transition-colors",
                      amountPaid === total
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Exact
                  </button>
                  {QUICK_AMOUNTS.filter((a) => a >= total).slice(0, 3).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmountPaid(a)}
                      className={clsx(
                        "py-2 rounded-lg border text-xs font-medium transition-colors",
                        amountPaid === a
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {a.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Change / shortfall */}
                {amountPaid > 0 && (
                  <div className={clsx(
                    "mt-3 rounded-xl px-4 py-3 flex justify-between items-center",
                    change > 0 ? "bg-green-50" : shortfall > 0 ? "bg-red-50" : "bg-slate-50"
                  )}>
                    <span className="text-sm font-medium text-slate-600">
                      {change > 0 ? "Change to return" : shortfall > 0 ? "Still needed" : "Exact amount"}
                    </span>
                    <span className={clsx(
                      "text-lg font-bold",
                      change > 0 ? "text-green-700" : shortfall > 0 ? "text-red-700" : "text-slate-800"
                    )}>
                      {change > 0 ? `PKR ${change.toLocaleString()}` : shortfall > 0 ? `PKR ${shortfall.toLocaleString()}` : "✓"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="label">Note (optional)</label>
              <input
                className="input text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Customer brought own bottles, special request…"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={
              isPending ||
              (method === "cash" && amountPaid < total) ||
              (method === "credit" && !customer)
            }
            className="btn-primary flex-1 text-base py-3 font-bold disabled:opacity-50"
          >
            {isPending ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
