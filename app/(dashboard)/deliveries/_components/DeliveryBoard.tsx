"use client";

import DeliveryCard from "./DeliveryCard";
import type { DeliveryRow, DriverOption } from "./DeliveriesClient";

const COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "pending",     label: "Pending",     color: "border-yellow-300 bg-yellow-50" },
  { status: "assigned",    label: "Assigned",    color: "border-blue-300 bg-blue-50" },
  { status: "loaded",      label: "Loaded",      color: "border-cyan-300 bg-cyan-50" },
  { status: "en_route",    label: "En Route",    color: "border-indigo-300 bg-indigo-50" },
  { status: "delivered",   label: "Delivered",   color: "border-green-300 bg-green-50" },
  { status: "failed",      label: "Failed",      color: "border-red-300 bg-red-50" },
];

interface Props {
  deliveries: DeliveryRow[];
  drivers: DriverOption[];
  canAssign: boolean;
  onAssign: (d: DeliveryRow) => void;
  onUpdateStatus: (d: DeliveryRow) => void;
}

export default function DeliveryBoard({ deliveries, canAssign, onAssign, onUpdateStatus }: Props) {
  const grouped = Object.fromEntries(COLUMNS.map((c) => [c.status, deliveries.filter((d) => d.status === c.status)]));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = grouped[col.status] ?? [];
        return (
          <div key={col.status} className={`flex-shrink-0 w-64 rounded-xl border-2 ${col.color} flex flex-col`}>
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-current/10">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label}</span>
              <span className="text-xs bg-white/70 text-slate-600 font-bold px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto max-h-[70vh]">
              {items.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Empty</p>
              ) : (
                items.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    canAssign={canAssign}
                    onAssign={onAssign}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
