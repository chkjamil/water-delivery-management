"use client";

import { MapPin, User, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { DeliveryRow, DriverOption } from "./DeliveriesClient";

interface Props {
  delivery: DeliveryRow;
  canAssign: boolean;
  onAssign: (d: DeliveryRow) => void;
  onUpdateStatus: (d: DeliveryRow) => void;
}

const CAN_UPDATE = ["assigned", "loaded", "en_route"];

export default function DeliveryCard({ delivery, canAssign, onAssign, onUpdateStatus }: Props) {
  const order = delivery.order;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      {/* Order number + link */}
      <div className="flex items-center justify-between gap-1">
        <Link href={`/orders/${delivery.order_id}`} className="text-xs font-bold text-brand-600 hover:underline">
          #{order?.order_number ?? "—"}
        </Link>
        {order?.delivery_date && (
          <span className="text-xs text-slate-400">{formatDate(order.delivery_date + "T00:00:00")}</span>
        )}
      </div>

      {/* Customer */}
      {order?.customer && (
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-700 font-medium truncate">{order.customer.full_name}</span>
        </div>
      )}

      {/* Address */}
      {order?.address && (
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-slate-500 leading-tight">
            {order.address.address_line1}, {order.address.city}
          </span>
        </div>
      )}

      {/* Driver */}
      {delivery.driver ? (
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500">{delivery.driver.full_name}</span>
        </div>
      ) : (
        <span className="text-xs text-amber-500 font-medium">Unassigned</span>
      )}

      {/* Amount */}
      {order?.total_amount != null && (
        <p className="text-xs font-bold text-slate-700">PKR {order.total_amount.toLocaleString()}</p>
      )}

      {/* Actions */}
      {canAssign && (
        <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
          <button
            onClick={() => onAssign(delivery)}
            className="btn-ghost btn-sm flex-1 justify-center text-xs"
          >
            {delivery.driver ? "Reassign" : "Assign"}
          </button>
          {CAN_UPDATE.includes(delivery.status) && (
            <button
              onClick={() => onUpdateStatus(delivery)}
              className="btn-primary btn-sm flex-1 justify-center text-xs"
            >
              Update
            </button>
          )}
        </div>
      )}
    </div>
  );
}
