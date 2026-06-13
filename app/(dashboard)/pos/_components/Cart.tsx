"use client";

import { Trash2, Plus, Minus, ShoppingCart, CheckCircle, Tag } from "lucide-react";
import CustomerSearch from "./CustomerSearch";
import type { CartItem, POSCustomer } from "./POSClient";
import { clsx } from "clsx";

interface Props {
  cart:             CartItem[];
  customer:         POSCustomer | null;
  subtotal:         number;
  discount:         number;
  total:            number;
  isPending:        boolean;
  lastOrder:        { id: string; order_number: string } | null;
  onUpdateQty:      (productId: string, qty: number) => void;
  onRemove:         (productId: string) => void;
  onDiscountChange: (d: number) => void;
  onCustomerChange: (c: POSCustomer | null) => void;
  onCheckout:       () => void;
  onClear:          () => void;
}

export default function Cart({
  cart, customer, subtotal, discount, total, isPending, lastOrder,
  onUpdateQty, onRemove, onDiscountChange, onCustomerChange, onCheckout, onClear,
}: Props) {

  // ── Success state ─────────────────────────────────────────────────────────
  if (lastOrder) {
    return (
      <div className="card flex flex-col items-center justify-center gap-4 p-8 h-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-800">Order Placed!</p>
          <p className="text-sm text-slate-500 mt-1">
            Order #{lastOrder.order_number}
          </p>
        </div>
        <button onClick={onClear} className="btn-primary w-full">
          New Sale
        </button>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="card flex flex-col h-full">
        <div className="card-header">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={16} /> Cart
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
          <ShoppingCart size={40} className="mb-3 text-slate-300" />
          <p className="font-medium text-sm">Cart is empty</p>
          <p className="text-xs mt-1">Tap a product to add it</p>
        </div>
      </div>
    );
  }

  // ── Cart with items ───────────────────────────────────────────────────────
  return (
    <div className="card flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="card-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={16} /> Cart ({cart.length})
          </h2>
          <button onClick={onClear} className="text-xs text-red-400 hover:text-red-600 transition-colors">
            Clear all
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {cart.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{item.product.name}</p>
              <p className="text-xs text-slate-400">{item.product.size_label} · PKR {item.unit_price}</p>
            </div>

            {/* Qty controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Minus size={12} />
              </button>
              <span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
              <button
                onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Line total */}
            <div className="text-right w-20 flex-shrink-0">
              <p className="text-sm font-bold text-slate-800">
                {(item.unit_price * item.quantity).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => onRemove(item.product.id)}
              className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0 border-t border-slate-100 px-4 pt-3 pb-4 space-y-3">

        {/* Customer */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Customer</p>
          <CustomerSearch value={customer} onChange={onCustomerChange} />
        </div>

        {/* Discount */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
            <Tag size={11} /> Discount (PKR)
          </label>
          <input
            type="number"
            min="0"
            max={subtotal}
            className="input text-sm"
            value={discount || ""}
            onChange={(e) => onDiscountChange(Math.min(parseFloat(e.target.value) || 0, subtotal))}
            placeholder="0"
          />
        </div>

        {/* Totals */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>- PKR {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-800 pt-1 border-t border-slate-100">
            <span>Total</span>
            <span>PKR {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={isPending || cart.length === 0}
          className={clsx(
            "btn-primary w-full text-base py-3 font-bold",
            isPending && "opacity-70"
          )}
        >
          {isPending ? "Processing…" : `Charge PKR ${total.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
