"use client";

import Link from "next/link";
import { format } from "date-fns";
import { MapPin, CheckCircle, Clock, CalendarDays } from "lucide-react";

interface Delivery { id: string; status: string; order: any; }
interface Stop {
  id: string; status: "pending" | "completed" | "skipped";
  customer: { full_name: string } | null;
  address: { address_line1: string; city: string } | null;
}
interface UpcomingDay { date: string; stops: { customer_name: string }[]; }

export default function StaffDashboard({
  deliveries, stops, upcoming, fullName, role,
}: {
  deliveries: Delivery[];
  stops: Stop[];
  upcoming: UpcomingDay[];
  fullName: string;
  role: string;
}) {
  const pendingDeliveries = deliveries.filter((d) => d.status !== "delivered").length;
  const pendingStops = stops.filter((s) => s.status === "pending").length;
  const doneToday = deliveries.filter((d) => d.status === "delivered").length
    + stops.filter((s) => s.status === "completed").length;
  const upcomingWithStops = upcoming.filter((d) => d.stops.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Hey, {fullName.split(" ")[0]} 👷</h2>
        <p className="text-slate-500 text-sm mt-1">Here's your work for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-brand-600">{pendingDeliveries}</div>
          <div className="text-xs text-slate-500 mt-1">Pending Deliveries</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{pendingStops}</div>
          <div className="text-xs text-slate-500 mt-1">Pending Stops</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{doneToday}</div>
          <div className="text-xs text-slate-500 mt-1">Done Today</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        {role === "staff" && (
          <Link href="/pos" className="btn-primary flex-1 text-center min-w-[110px]">🛒 POS</Link>
        )}
        <Link href="/my-deliveries" className="btn-secondary flex-1 text-center min-w-[110px]">🚚 Deliveries</Link>
        <Link href="/my-stops" className="btn-secondary flex-1 text-center min-w-[110px]">📅 Stops</Link>
        <Link href="/upcoming-deliveries" className="btn-secondary flex-1 text-center min-w-[110px]">🔭 Upcoming</Link>
      </div>

      {/* My Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">My Deliveries</h3>
          <Link href="/my-deliveries" className="text-xs text-brand-600 hover:underline">View all →</Link>
        </div>
        {deliveries.length === 0 ? (
          <div className="card p-6 text-center text-slate-400">
            <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
            <p className="text-sm">No active deliveries</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.slice(0, 5).map((d) => (
              <div key={d.id} className="card p-3 flex items-center gap-3">
                <MapPin size={16} className="text-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{d.order?.order_number || "—"}</p>
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
        )}
      </div>

      {/* Today's recurring stops */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Today's Stops (Recurring Route)</h3>
          <Link href="/my-stops" className="text-xs text-brand-600 hover:underline">View all →</Link>
        </div>
        {stops.length === 0 ? (
          <div className="card p-6 text-center text-slate-400">
            <CalendarDays size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No scheduled stops today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stops.slice(0, 5).map((s) => (
              <div key={s.id} className="card p-3 flex items-center gap-3">
                <Clock size={16} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.customer?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {s.address?.address_line1}, {s.address?.city}
                  </p>
                </div>
                <span className={`badge text-xs ${
                  s.status === "completed" ? "bg-green-100 text-green-700" :
                  s.status === "skipped" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming preview */}
      {upcomingWithStops.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming</h3>
            <Link href="/upcoming-deliveries" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <div className="card divide-y divide-slate-50">
            {upcomingWithStops.slice(0, 4).map((d) => (
              <div key={d.date} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-700">{format(new Date(d.date + "T00:00:00"), "EEEE, MMM d")}</span>
                <span className="badge bg-slate-100 text-slate-600 text-xs">
                  {d.stops.length} {d.stops.length === 1 ? "stop" : "stops"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
