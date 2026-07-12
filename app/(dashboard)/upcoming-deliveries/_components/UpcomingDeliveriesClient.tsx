"use client";

import { format } from "date-fns";
import { CalendarDays, Phone, Wallet } from "lucide-react";
import type { UpcomingDay } from "../actions";

export default function UpcomingDeliveriesClient({
  upcoming, zoneNames,
}: { upcoming: UpcomingDay[]; zoneNames: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-brand-600" />
        <h1 className="font-semibold text-slate-800">Upcoming Deliveries (Next 7 Days)</h1>
      </div>

      {upcoming.every((d) => d.stops.length === 0) && (
        <div className="card p-8 text-center text-slate-400">
          <p className="text-sm">No scheduled deliveries in the next 7 days.</p>
          <p className="text-xs mt-1">Configure customer delivery schedules and the zone plan to see projections here.</p>
        </div>
      )}

      {upcoming.map((day) => (
        day.stops.length === 0 ? null : (
          <div key={day.date} className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-800 text-sm">
                {format(new Date(day.date + "T00:00:00"), "EEEE, MMM d")}
              </h2>
              <span className="badge bg-slate-100 text-slate-600 text-xs">{day.stops.length} {day.stops.length === 1 ? "stop" : "stops"}</span>
            </div>
            <div className="card-body p-0 divide-y divide-slate-50">
              {day.stops.map((stop, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{stop.customer_name}</p>
                    <p className="text-xs text-slate-400">
                      {stop.zone_id ? zoneNames[stop.zone_id] ?? "Unknown zone" : "No zone"}
                      {stop.time_slot_label && <span> · {stop.time_slot_label}</span>}
                      {!stop.driver_id && <span className="text-amber-600 ml-1">· unassigned</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge text-xs ${stop.payment_method_snapshot === "monthly" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {stop.payment_method_snapshot === "monthly" && <Wallet size={11} className="inline mr-1" />}
                      {stop.payment_method_snapshot}
                    </span>
                    {stop.customer_phone && (
                      <a href={`tel:${stop.customer_phone}`} className="btn-ghost btn-sm p-1.5 text-brand-600">
                        <Phone size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
