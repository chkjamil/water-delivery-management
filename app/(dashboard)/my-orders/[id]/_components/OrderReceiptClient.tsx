"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Package, CreditCard } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatPKR, formatDate, formatDateTime } from "@/lib/format";

export type OrderReceipt = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  delivery_date: string | null;
  delivery_address: string | null;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  payment_method: string | null;
  payment_status: string;
  amount_paid: number;
  special_instructions: string | null;
  time_slot: { label: string } | null;
  address: { address_line1: string; address_line2: string | null; city: string } | null;
  delivery: {
    status: string;
    driver: { full_name: string } | null;
    delivered_at: string | null;
  } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    product: { name: string; size_label: string } | null;
  }[];
};

const ORDER_STEPS = ["pending", "confirmed", "dispatched", "en_route", "delivered"];

interface Props {
  order: OrderReceipt;
}

export default function OrderReceiptClient({ order }: Props) {
  const stepIdx = ORDER_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "failed";

  return (
    <div className="space-y-4 max-w-lg">
      {/* Back */}
      <div>
        <Link href="/my-orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} /> My Orders
        </Link>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Order #{order.order_number}</h1>
            <p className="text-sm text-slate-500">{formatDateTime(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} type="order" />
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Progress</p>
          <div className="flex items-center">
            {ORDER_STEPS.map((step, i) => {
              const done = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      done ? "bg-green-500 border-green-500 text-white"
                      : active ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 capitalize text-center leading-tight ${
                      active ? "text-brand-700 font-semibold" : done ? "text-green-600" : "text-slate-400"
                    }`}>
                      {step.replace("_", " ")}
                    </span>
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-green-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="card p-4 bg-red-50 border-red-200 text-center">
          <p className="font-semibold text-red-700 capitalize">{order.status}</p>
        </div>
      )}

      {/* Delivery info */}
      {order.delivery_date && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery</p>
          </div>
          <p className="font-semibold text-slate-800">{formatDate(order.delivery_date + "T00:00:00")}</p>
          {order.time_slot && <p className="text-sm text-slate-500">{order.time_slot.label}</p>}
          {order.address && (
            <div className="flex items-start gap-1.5 mt-2 text-sm text-slate-600">
              <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                {order.address.address_line1}
                {order.address.address_line2 && `, ${order.address.address_line2}`}
                , {order.address.city}
              </span>
            </div>
          )}
          {order.delivery?.driver && (
            <p className="text-xs text-slate-400 mt-1">Driver: {order.delivery.driver.full_name}</p>
          )}
          {order.delivery?.delivered_at && (
            <p className="text-xs text-green-600 mt-1">✅ Delivered at {formatDateTime(order.delivery.delivered_at)}</p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Package size={14} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Items</p>
        </div>
        <div className="divide-y divide-slate-100">
          {order.order_items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.product?.name ?? "Product"}</p>
                <p className="text-xs text-slate-400">{item.product?.size_label ?? ""} × {item.quantity}</p>
              </div>
              <p className="font-medium text-slate-700">{formatPKR(item.quantity * item.unit_price)}</p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100 bg-slate-50 border-t border-slate-200">
          <div className="px-4 py-2 flex justify-between text-sm text-slate-500">
            <span>Subtotal</span><span>{formatPKR(order.subtotal)}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="px-4 py-2 flex justify-between text-sm text-slate-500">
              <span>Delivery Fee</span><span>{formatPKR(order.delivery_fee)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="px-4 py-2 flex justify-between text-sm text-green-600">
              <span>Discount</span><span>−{formatPKR(order.discount_amount)}</span>
            </div>
          )}
          <div className="px-4 py-3 flex justify-between font-bold text-slate-800">
            <span>Total</span><span>{formatPKR(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={14} className="text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm capitalize">{order.payment_method?.replace("_", " ") ?? "—"}</p>
            <StatusBadge status={order.payment_status} type="payment" className="mt-1" />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Paid</p>
            <p className="font-bold text-green-600">{formatPKR(order.amount_paid ?? 0)}</p>
          </div>
        </div>
      </div>

      {order.special_instructions && (
        <div className="card p-4 bg-amber-50 border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Special Instructions</p>
          <p className="text-sm text-amber-800">{order.special_instructions}</p>
        </div>
      )}

      <Link href="/order" className="btn-secondary w-full justify-center mt-2">
        🔁 Re-order Same Items
      </Link>
    </div>
  );
}
