"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, RefreshCw } from "lucide-react";
import DeliveryBoard from "./DeliveryBoard";
import AssignDriverModal from "./AssignDriverModal";
import UpdateDeliveryModal from "./UpdateDeliveryModal";
import toast from "react-hot-toast";

export type DriverOption = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type DeliveryRow = {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  failed_reason: string | null;
  driver: { id: string; full_name: string; phone: string | null } | null;
  order: {
    order_number: string;
    delivery_date: string | null;
    total_amount: number;
    customer: { id: string; full_name: string; phone: string | null } | null;
    address: { address_line1: string; city: string } | null;
  } | null;
};

type ModalState =
  | { type: "none" }
  | { type: "assign"; delivery: DeliveryRow }
  | { type: "status"; delivery: DeliveryRow };

interface Props {
  initialDeliveries: DeliveryRow[];
  drivers: DriverOption[];
  canAssign: boolean;
}

export default function DeliveriesClient({ initialDeliveries, drivers, canAssign }: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>(initialDeliveries);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [dateFilter, setDateFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");

  function patchDelivery(updated: DeliveryRow) {
    setDeliveries((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  }

  const filtered = useMemo(() => {
    let list = deliveries;
    if (dateFilter) list = list.filter((d) => d.order?.delivery_date === dateFilter);
    if (driverFilter !== "all") {
      if (driverFilter === "unassigned") list = list.filter((d) => !d.driver);
      else list = list.filter((d) => d.driver?.id === driverFilter);
    }
    return list;
  }, [deliveries, dateFilter, driverFilter]);

  const stats = {
    total: deliveries.length,
    unassigned: deliveries.filter((d) => !d.driver && d.status === "pending").length,
    enRoute: deliveries.filter((d) => d.status === "en_route").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-brand-700" },
          { label: "Unassigned", value: stats.unassigned, color: stats.unassigned > 0 ? "text-red-600" : "text-slate-700" },
          { label: "En Route", value: stats.enRoute, color: "text-indigo-600" },
          { label: "Delivered", value: stats.delivered, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="card p-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input text-sm"
          />
        </div>
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="input text-sm"
        >
          <option value="all">All Drivers</option>
          <option value="unassigned">Unassigned</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        {(dateFilter || driverFilter !== "all") && (
          <button onClick={() => { setDateFilter(""); setDriverFilter("all"); }} className="btn-ghost btn-sm text-xs">
            Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} deliveries</span>
      </div>

      {/* Board */}
      <DeliveryBoard
        deliveries={filtered}
        drivers={drivers}
        canAssign={canAssign}
        onAssign={(d) => setModal({ type: "assign", delivery: d })}
        onUpdateStatus={(d) => setModal({ type: "status", delivery: d })}
      />

      {modal.type === "assign" && (
        <AssignDriverModal
          delivery={modal.delivery}
          drivers={drivers}
          onClose={() => setModal({ type: "none" })}
          onUpdated={patchDelivery}
        />
      )}
      {modal.type === "status" && (
        <UpdateDeliveryModal
          delivery={modal.delivery}
          onClose={() => setModal({ type: "none" })}
          onUpdated={patchDelivery}
        />
      )}
    </div>
  );
}
