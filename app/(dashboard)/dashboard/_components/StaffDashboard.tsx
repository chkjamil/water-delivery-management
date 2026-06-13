"use client";

import Link from "next/link";
import { MapPin, CheckCircle, Clock } from "lucide-react";

interface Delivery { id: string; status: string; order: any; }

export default function StaffDashboard({ deliveries, fullName }: { deliveries: Delivery[]; fullName: string; }) {
  const done      = deliveries.filter((d) => d.status === "delivered").length;
  const pending   = deliveries.filter((d) => d.status !== "delivered").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Hey, {fullName.split(" ")[0]} 👷</h2>
        <p className="text-slate-500 text-sm mt-1">Here are your tasks for today.</p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-brand-600">{pending}</div>
          <div className="text-sm text-slate-500 mt-1">Pending</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{done}</div>
          <div className="text-sm text-slate-500 mt-1">Done</div>
        </div>
      </div>

      {/* Today's deliveries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">My Deliveries</h3>
          <Link href="/my-deliveries" className="text-xs text-brand-600 hover:underline">View all →</Link>
        </div>
        <div className="space-y-3">
          {deliveries.length === 0 && (
            <div className="card p-6 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">No active deliveries assigned!</p>
            </div>
          )}
          {deliveries.map((d) => (
            <div key={d.id} className="card p-4 flex items-center gap-4">
              <MapPin size={18} className="text-brand-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {d.order?.order_number || "—"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {d.order?.address?.address_line1}, {d.order?.address?.city}
                </p>
              </div>
              <span className={`badge badge-${d.status === "en_route" ? "enroute" : d.status}`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/pos" className="btn-primary flex-1 text-center">🛒 Open POS</Link>
        <Link href="/my-deliveries" className="btn-secondary flex-1 text-center">🚚 Deliveries</Link>
      </div>
    </div>
  );
}
