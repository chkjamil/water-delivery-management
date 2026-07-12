"use client";

import { useState } from "react";
import { MapPin, Phone, CheckCircle, XCircle, Wallet, Clock } from "lucide-react";
import CompleteStopModal from "./CompleteStopModal";
import SkipStopModal from "./SkipStopModal";

export interface MyStopRow {
  id: string;
  status: "pending" | "completed" | "skipped";
  payment_method_snapshot: "cash" | "monthly";
  cash_collected: boolean | null;
  skipped_reason: string | null;
  customer: { full_name: string; phone: string | null } | null;
  address: { address_line1: string; address_line2: string | null; city: string } | null;
  time_slot: { label: string; start_time: string; end_time: string } | null;
  items: {
    id: string; product_id: string; planned_qty: number; actual_qty: number | null; unit_price: number;
    product: { name: string; size_label: string } | null;
  }[];
}

interface ProductOption { id: string; name: string; size_label: string; }

type ModalState = { type: "none" } | { type: "complete"; stop: MyStopRow } | { type: "skip"; stop: MyStopRow };

export default function MyStopsClient({ initialStops, products }: { initialStops: MyStopRow[]; products: ProductOption[] }) {
  const [stops, setStops] = useState<MyStopRow[]>(initialStops);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  function patch(id: string, patch: Partial<MyStopRow>) {
    setStops((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  const stats = {
    total: stops.length,
    completed: stops.filter((s) => s.status === "completed").length,
    pending: stops.filter((s) => s.status === "pending").length,
  };

  return (
    <div className="space-y-4">
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

      {stops.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-semibold text-slate-600">No scheduled stops today</p>
          <p className="text-sm text-slate-400 mt-1">Nothing due for delivery based on customer schedules</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stops.map((stop) => {
            const isDone = stop.status !== "pending";
            return (
              <div key={stop.id} className={`card p-4 space-y-3 ${isDone ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{stop.customer?.full_name ?? "Unknown"}</p>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${stop.payment_method_snapshot === "monthly" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {stop.payment_method_snapshot === "monthly" ? <Wallet size={11} className="inline mr-1" /> : null}
                      {stop.payment_method_snapshot}
                    </span>
                    <span className={`badge text-xs ${
                      stop.status === "completed" ? "bg-green-100 text-green-700" :
                      stop.status === "skipped" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {stop.status}
                    </span>
                  </div>
                </div>

                {stop.customer?.phone && (
                  <a href={`tel:${stop.customer.phone}`} className="btn-ghost btn-sm text-brand-600 inline-flex">
                    <Phone size={14} /> Call
                  </a>
                )}

                {stop.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                      {stop.address.address_line1}
                      {stop.address.address_line2 && `, ${stop.address.address_line2}`}
                      , {stop.address.city}
                    </span>
                  </div>
                )}

                {stop.time_slot && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{stop.time_slot.label}</span>
                  </div>
                )}

                {stop.items.length > 0 && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">
                    {stop.items.map((it) => `${it.product?.name ?? "Item"} x${it.actual_qty ?? it.planned_qty}`).join(", ")}
                  </div>
                )}

                {stop.status === "skipped" && stop.skipped_reason && (
                  <p className="text-xs text-red-500">Reason: {stop.skipped_reason}</p>
                )}

                {!isDone && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setModal({ type: "complete", stop })}
                      className="btn-primary btn-sm flex-1 justify-center gap-1.5 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle size={13} /> Delivered
                    </button>
                    <button
                      onClick={() => setModal({ type: "skip", stop })}
                      className="btn-secondary btn-sm text-red-500 hover:bg-red-50"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal.type === "complete" && (
        <CompleteStopModal
          stop={modal.stop}
          products={products}
          onClose={() => setModal({ type: "none" })}
          onDone={() => patch(modal.stop.id, { status: "completed" })}
        />
      )}
      {modal.type === "skip" && (
        <SkipStopModal
          stop={modal.stop}
          onClose={() => setModal({ type: "none" })}
          onDone={() => patch(modal.stop.id, { status: "skipped" })}
        />
      )}
    </div>
  );
}
