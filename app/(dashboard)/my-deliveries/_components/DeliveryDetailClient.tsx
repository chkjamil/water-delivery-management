"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, MapPin, Phone, Package, CheckCircle, XCircle, Play, Navigation } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import DeliveredModal from "./DeliveredModal";
import FailedModal from "./FailedModal";
import { startDelivery, goEnRoute } from "../actions";
import { formatDate, formatPKR } from "@/lib/format";
import toast from "react-hot-toast";

export type MyDeliveryDetail = {
  id: string;
  order_id: string;
  status: string;
  failed_reason: string | null;
  notes: string | null;
  empty_bottles_collected: number;
  delivered_at: string | null;
  order: {
    id: string;
    order_number: string;
    delivery_date: string | null;
    total_amount: number;
    payment_method: string | null;
    payment_status: string;
    amount_paid: number;
    special_instructions: string | null;
    customer: { full_name: string; phone: string | null; email: string } | null;
    address: { address_line1: string; address_line2: string | null; city: string } | null;
    time_slot: { label: string } | null;
    order_items: {
      id: string;
      quantity: number;
      unit_price: number;
      product: { name: string; size_label: string } | null;
    }[];
  } | null;
};

interface Props {
  delivery: MyDeliveryDetail;
}

export default function DeliveryDetailClient({ delivery: initial }: Props) {
  const [delivery, setDelivery] = useState<MyDeliveryDetail>(initial);
  const [modal, setModal] = useState<"none" | "delivered" | "failed">("none");
  const [pending, start] = useTransition();

  const order = delivery.order;
  const isDone = ["delivered", "failed"].includes(delivery.status);

  function handleStart() {
    start(async () => {
      const res = await startDelivery(delivery.id);
      if (res.error) { toast.error(res.error); return; }
      setDelivery((d) => ({ ...d, status: "loaded" }));
      toast.success("Marked as loaded");
    });
  }

  function handleEnRoute() {
    start(async () => {
      const res = await goEnRoute(delivery.id);
      if (res.error) { toast.error(res.error); return; }
      setDelivery((d) => ({ ...d, status: "en_route" }));
      toast.success("On the way!");
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Link href="/my-deliveries" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">#{order?.order_number}</h1>
          <StatusBadge status={delivery.status} type="delivery" />
        </div>
        {order?.delivery_date && (
          <p className="text-sm text-slate-500">{formatDate(order.delivery_date + "T00:00:00")} · {order.time_slot?.label ?? ""}</p>
        )}
      </div>

      {/* Customer card */}
      {order?.customer && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">{order.customer.full_name}</p>
            <p className="text-sm text-slate-500">{order.customer.phone}</p>
          </div>
          {order.customer.phone && (
            <a href={`tel:${order.customer.phone}`} className="btn-primary btn-sm gap-1.5">
              <Phone size={14} /> Call
            </a>
          )}
        </div>
      )}

      {/* Address */}
      {order?.address && (
        <div className="card p-4">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">{order.address.address_line1}</p>
              {order.address.address_line2 && <p className="text-sm text-slate-600">{order.address.address_line2}</p>}
              <p className="text-sm text-slate-500">{order.address.city}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {order?.order_items && order.order_items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Package size={14} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Items to Deliver</p>
          </div>
          <div className="divide-y divide-slate-100">
            {order.order_items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.product?.name ?? "Product"}</p>
                  <p className="text-xs text-slate-400">{item.product?.size_label ?? ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">× {item.quantity}</p>
                  <p className="text-xs text-slate-400">{formatPKR(item.unit_price)} each</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between">
            <span className="text-sm font-semibold text-slate-700">Total</span>
            <span className="font-bold text-brand-700">{formatPKR(order.total_amount)}</span>
          </div>
        </div>
      )}

      {/* Payment */}
      {order && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm capitalize">{order.payment_method?.replace("_", " ") ?? "—"}</p>
              <StatusBadge status={order.payment_status} type="payment" className="mt-1" />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total</p>
              <p className="font-bold text-slate-800">{formatPKR(order.total_amount)}</p>
              {(order.amount_paid ?? 0) < order.total_amount && (
                <p className="text-xs text-red-500">Collect: {formatPKR(order.total_amount - (order.amount_paid ?? 0))}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {order?.special_instructions && (
        <div className="card p-4 bg-amber-50 border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Instructions</p>
          <p className="text-sm text-amber-800">{order.special_instructions}</p>
        </div>
      )}

      {/* Action buttons */}
      {!isDone && (
        <div className="flex gap-2">
          {delivery.status === "assigned" && (
            <button onClick={handleStart} disabled={pending} className="btn-secondary btn-sm flex-1 justify-center gap-1.5 py-3">
              <Play size={16} /> Start Loading
            </button>
          )}
          {delivery.status === "loaded" && (
            <button onClick={handleEnRoute} disabled={pending} className="btn-primary flex-1 justify-center gap-1.5 py-3">
              <Navigation size={16} /> Go En Route
            </button>
          )}
          {delivery.status === "en_route" && (
            <>
              <button
                onClick={() => setModal("delivered")}
                className="btn-primary flex-1 justify-center gap-1.5 py-3 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} /> Delivered
              </button>
              <button
                onClick={() => setModal("failed")}
                className="btn-secondary text-red-500 hover:bg-red-50 px-4 py-3"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {delivery.status === "delivered" && (
        <div className="card p-4 bg-green-50 border-green-200 text-center">
          <p className="text-green-700 font-semibold">✅ Delivered successfully!</p>
          {delivery.empty_bottles_collected > 0 && (
            <p className="text-sm text-green-600 mt-1">{delivery.empty_bottles_collected} bottles collected</p>
          )}
        </div>
      )}

      {delivery.status === "failed" && (
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-red-700 font-semibold">❌ Delivery failed</p>
          {delivery.failed_reason && <p className="text-sm text-red-600 mt-1">{delivery.failed_reason}</p>}
        </div>
      )}

      {modal === "delivered" && (
        <DeliveredModal
          deliveryId={delivery.id}
          orderNumber={order?.order_number ?? ""}
          onClose={() => setModal("none")}
          onDone={() => setDelivery((d) => ({ ...d, status: "delivered" }))}
        />
      )}
      {modal === "failed" && (
        <FailedModal
          deliveryId={delivery.id}
          orderNumber={order?.order_number ?? ""}
          onClose={() => setModal("none")}
          onDone={() => setDelivery((d) => ({ ...d, status: "failed" }))}
        />
      )}
    </div>
  );
}
