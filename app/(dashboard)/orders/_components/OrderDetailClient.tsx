"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, User, CreditCard, Package, Printer } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import UpdateStatusModal from "./UpdateStatusModal";
import RecordPaymentModal from "./RecordPaymentModal";
import CancelOrderModal from "./CancelOrderModal";
import { formatPKR, formatDate, formatDateTime } from "@/lib/format";
import type { OrderRow } from "./OrdersClient";

export type OrderDetail = OrderRow & {
  special_instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    zone: { name: string } | null;
  } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    product: { id: string; name: string; sku: string; size_label: string } | null;
  }[];
  delivery: {
    id: string;
    status: string;
    assigned_at: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    failed_reason: string | null;
    empty_bottles_collected: number;
    driver: { full_name: string; phone: string | null } | null;
  } | null;
};

const ORDER_STEPS = ["pending", "confirmed", "dispatched", "en_route", "delivered"];

interface Props {
  order: OrderDetail;
  canEdit: boolean;
}

export default function OrderDetailClient({ order: initial, canEdit }: Props) {
  const [order, setOrder] = useState<OrderDetail>(initial);
  const [modal, setModal] = useState<"none" | "status" | "payment" | "cancel">("none");

  function patchOrder(updated: OrderRow) {
    setOrder((prev) => ({ ...prev, ...updated }));
  }

  const currentStepIdx = ORDER_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "failed";

  return (
    <div className="space-y-5 max-w-3xl print:max-w-none">
      {/* Back + Header */}
      <div>
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 print:hidden">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Order #{order.order_number}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} type="order" />
            <StatusBadge status={order.payment_status} type="payment" />
            <button
              onClick={() => window.print()}
              className="btn-secondary btn-sm print:hidden"
              title="Print receipt"
            >
              <Printer size={14} className="inline -mt-0.5 mr-1" />Receipt
            </button>
            {canEdit && !isCancelled && order.status !== "delivered" && (
              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <button onClick={() => setModal("status")} className="btn-primary btn-sm">Update Status</button>
                {order.payment_status !== "paid" && (
                  <button onClick={() => setModal("payment")} className="btn-secondary btn-sm text-green-600">Record Payment</button>
                )}
                {["pending", "confirmed"].includes(order.status) && (
                  <button onClick={() => setModal("cancel")} className="btn-secondary btn-sm text-red-500">Cancel</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="card p-4 print:hidden">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Progress</p>
          <div className="flex items-center gap-0">
            {ORDER_STEPS.map((step, i) => {
              const done = currentStepIdx > i;
              const active = currentStepIdx === i;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-shrink-0 ${i === 0 ? "" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      done ? "bg-green-500 border-green-500 text-white"
                      : active ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 capitalize text-center ${active ? "text-brand-700 font-semibold" : done ? "text-green-600" : "text-slate-400"}`}>
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

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</p>
          </div>
          {order.customer ? (
            <>
              <Link href={`/customers/${order.customer.id}`} className="font-semibold text-brand-600 hover:underline">
                {order.customer.full_name}
              </Link>
              <p className="text-sm text-slate-600">{order.customer.phone}</p>
              <p className="text-sm text-slate-500">{order.customer.email}</p>
            </>
          ) : (
            <p className="text-slate-500 italic">Walk-in / anonymous</p>
          )}
        </div>

        {/* Delivery info */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery</p>
          </div>
          {order.delivery_date ? (
            <>
              <p className="font-semibold text-slate-800">{formatDate(order.delivery_date + "T00:00:00")}</p>
              {order.time_slot && <p className="text-sm text-slate-500">{order.time_slot.label}</p>}
              {order.address && (
                <p className="text-sm text-slate-600 mt-1">
                  {order.address.address_line1}
                  {order.address.address_line2 && `, ${order.address.address_line2}`}
                  , {order.address.city}
                  {order.address.zone && <span className="text-slate-400"> · {order.address.zone.name}</span>}
                </p>
              )}
              {order.delivery_address && !order.address && (
                <p className="text-sm text-slate-600 mt-1">{order.delivery_address}</p>
              )}
            </>
          ) : (
            <p className="text-slate-500 italic">POS / in-store</p>
          )}
        </div>

        {/* Payment */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="capitalize">{order.payment_method?.replace("_", " ") ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={order.payment_status} type="payment" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{formatPKR(order.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="text-green-600 font-medium">{formatPKR(order.amount_paid ?? 0)}</span></div>
            {(order.amount_paid ?? 0) < order.total_amount && (
              <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-700 font-semibold">Remaining</span><span className="font-bold text-red-600">{formatPKR(order.total_amount - (order.amount_paid ?? 0))}</span></div>
            )}
          </div>
        </div>

        {/* Delivery record */}
        {order.delivery && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery Record</p>
            </div>
            <StatusBadge status={order.delivery.status} type="delivery" />
            {order.delivery.driver && (
              <p className="text-sm text-slate-700 mt-2">Driver: <span className="font-medium">{order.delivery.driver.full_name}</span></p>
            )}
            {order.delivery.delivered_at && (
              <p className="text-xs text-slate-500 mt-1">Delivered: {formatDateTime(order.delivery.delivered_at)}</p>
            )}
            {order.delivery.failed_reason && (
              <p className="text-xs text-red-600 mt-1">Reason: {order.delivery.failed_reason}</p>
            )}
            {order.delivery.empty_bottles_collected > 0 && (
              <p className="text-xs text-slate-500 mt-1">Bottles collected: {order.delivery.empty_bottles_collected}</p>
            )}
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Package size={14} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Order Items</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Product", "Qty", "Unit Price", "Subtotal"].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.order_items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">{item.product?.name ?? "Product"}</p>
                  <p className="text-xs text-slate-400">{item.product?.size_label ?? ""}</p>
                </td>
                <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                <td className="px-5 py-3 text-slate-600">{formatPKR(item.unit_price)}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{formatPKR(item.quantity * item.unit_price - (item.discount_amount ?? 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr>
              <td colSpan={3} className="px-5 py-2.5 text-right text-sm text-slate-500">Subtotal</td>
              <td className="px-5 py-2.5 text-sm font-medium">{formatPKR(order.subtotal)}</td>
            </tr>
            {order.delivery_fee > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-1 text-right text-sm text-slate-500">Delivery Fee</td>
                <td className="px-5 py-1 text-sm font-medium">{formatPKR(order.delivery_fee)}</td>
              </tr>
            )}
            {order.discount_amount > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-1 text-right text-sm text-slate-500">Discount</td>
                <td className="px-5 py-1 text-sm font-medium text-green-600">−{formatPKR(order.discount_amount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-5 py-2.5 text-right text-sm font-bold text-slate-700">Total</td>
              <td className="px-5 py-2.5 text-sm font-bold text-brand-700">{formatPKR(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.special_instructions && (
        <div className="card p-4 bg-amber-50 border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Special Instructions</p>
          <p className="text-sm text-amber-800">{order.special_instructions}</p>
        </div>
      )}

      {modal === "status" && (
        <UpdateStatusModal order={order} onClose={() => setModal("none")} onUpdated={patchOrder} />
      )}
      {modal === "payment" && (
        <RecordPaymentModal order={order} onClose={() => setModal("none")} onUpdated={patchOrder} />
      )}
      {modal === "cancel" && (
        <CancelOrderModal order={order} onClose={() => setModal("none")} onUpdated={patchOrder} />
      )}
    </div>
  );
}
