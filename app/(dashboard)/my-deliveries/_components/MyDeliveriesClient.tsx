"use client";

import { useState } from "react";
import { MapPin, Phone, Package, CheckCircle, XCircle, Play, Navigation } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import DeliveredModal from "./DeliveredModal";
import FailedModal from "./FailedModal";
import { startDelivery, goEnRoute } from "../actions";
import { formatDate, formatPKR } from "@/lib/format";
import toast from "react-hot-toast";
import { useTransition } from "react";

export type MyDeliveryRow = {
  id: string;
  order_id: string;
  status: string;
  order: {
    order_number: string;
    delivery_date: string | null;
    total_amount: number;
    payment_method: string | null;
    payment_status: string;
    amount_paid: number;
    customer: { full_name: string; phone: string | null } | null;
    address: { address_line1: string; address_line2: string | null; city: string } | null;
    time_slot: { label: string } | null;
  } | null;
};

type ModalState =
  | { type: "none" }
  | { type: "delivered"; deliveryId: string; orderNumber: string }
  | { type: "failed"; deliveryId: string; orderNumber: string };

interface Props {
  initialDeliveries: MyDeliveryRow[];
}

export default function MyDeliveriesClient({ initialDeliveries }: Props) {
  const [deliveries, setDeliveries] = useState<MyDeliveryRow[]>(initialDeliveries);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [pending, start] = useTransition();

  function patchStatus(id: string, status: string) {
    setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
  }

  function handleStart(deliveryId: string) {
    start(async () => {
      const res = await startDelivery(deliveryId);
      if (res.error) { toast.error(res.error); return; }
      patchStatus(deliveryId, "loaded");
      toast.success("Marked as loaded");
    });
  }

  function handleEnRoute(deliveryId: string) {
    start(async () => {
      const res = await goEnRoute(deliveryId);
      if (res.error) { toast.error(res.error); return; }
      patchStatus(deliveryId, "en_route");
      toast.success("On the way!");
    });
  }

  const stats = {
    total: deliveries.length,
    completed: deliveries.filter((d) => d.status === "delivered").length,
    pending: deliveries.filter((d) => !["delivered", "failed"].includes(d.status)).length,
  };

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Today</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-slate-500 mt-0.5">Done</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-slate-500 mt-0.5">Remaining</p>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🚚</div>
          <p className="font-semibold text-slate-600">No deliveries today</p>
          <p className="text-sm text-slate-400 mt-1">Check back later or contact your manager</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => {
            const order = delivery.order;
            const isDone = ["delivered", "failed"].includes(delivery.status);

            return (
              <div key={delivery.id} className={`card p-4 space-y-3 ${isDone ? "opacity-60" : ""}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/my-deliveries/${delivery.id}`} className="font-bold text-brand-600 text-sm hover:underline">
                      #{order?.order_number ?? "—"}
                    </Link>
                    {order?.delivery_date && (
                      <p className="text-xs text-slate-400">{formatDate(order.delivery_date + "T00:00:00")} · {order.time_slot?.label ?? ""}</p>
                    )}
                  </div>
                  <StatusBadge status={delivery.status} type="delivery" />
                </div>

                {/* Customer */}
                {order?.customer && (
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{order.customer.full_name}</p>
                    {order.customer.phone && (
                      <a href={`tel:${order.customer.phone}`} className="btn-ghost btn-sm text-brand-600">
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                )}

                {/* Address */}
                {order?.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                      {order.address.address_line1}
                      {order.address.address_line2 && `, ${order.address.address_line2}`}
                      , {order.address.city}
                    </span>
                  </div>
                )}

                {/* Payment info */}
                {order && (
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500">
                      <span className="capitalize">{order.payment_method?.replace("_", " ") ?? "—"}</span>
                      {" · "}
                      <StatusBadge status={order.payment_status} type="payment" />
                    </div>
                    <span className="font-bold text-slate-800">{formatPKR(order.total_amount)}</span>
                  </div>
                )}

                {/* Action buttons */}
                {!isDone && (
                  <div className="flex gap-2 pt-1">
                    {delivery.status === "assigned" && (
                      <button
                        onClick={() => handleStart(delivery.id)}
                        disabled={pending}
                        className="btn-secondary btn-sm flex-1 justify-center gap-1.5"
                      >
                        <Play size={13} /> Start Loading
                      </button>
                    )}
                    {delivery.status === "loaded" && (
                      <button
                        onClick={() => handleEnRoute(delivery.id)}
                        disabled={pending}
                        className="btn-primary btn-sm flex-1 justify-center gap-1.5"
                      >
                        <Navigation size={13} /> Go En Route
                      </button>
                    )}
                    {delivery.status === "en_route" && (
                      <>
                        <button
                          onClick={() => setModal({ type: "delivered", deliveryId: delivery.id, orderNumber: order?.order_number ?? "" })}
                          className="btn-primary btn-sm flex-1 justify-center gap-1.5 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle size={13} /> Delivered
                        </button>
                        <button
                          onClick={() => setModal({ type: "failed", deliveryId: delivery.id, orderNumber: order?.order_number ?? "" })}
                          className="btn-secondary btn-sm text-red-500 hover:bg-red-50"
                        >
                          <XCircle size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal.type === "delivered" && (
        <DeliveredModal
          deliveryId={modal.deliveryId}
          orderNumber={modal.orderNumber}
          onClose={() => setModal({ type: "none" })}
          onDone={() => patchStatus(modal.deliveryId, "delivered")}
        />
      )}
      {modal.type === "failed" && (
        <FailedModal
          deliveryId={modal.deliveryId}
          orderNumber={modal.orderNumber}
          onClose={() => setModal({ type: "none" })}
          onDone={() => patchStatus(modal.deliveryId, "failed")}
        />
      )}
    </div>
  );
}
