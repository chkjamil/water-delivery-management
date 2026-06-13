"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Plus, ShoppingBag } from "lucide-react";

interface Order { id: string; order_number: string; status: string; total_amount: number; delivery_date: string | null; created_at: string; }

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending", confirmed: "badge-confirmed", dispatched: "badge-dispatch",
  en_route: "badge-enroute", delivered: "badge-delivered", cancelled: "badge-cancelled",
};

export default function CustomerDashboard({ orders, fullName }: { orders: Order[]; fullName: string; }) {
  const activeOrder = orders.find((o) => !["delivered", "cancelled", "failed"].includes(o.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Hi, {fullName.split(" ")[0]}! 👋</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your water deliveries.</p>
      </div>

      {/* Active order banner */}
      {activeOrder && (
        <div className="card p-4 border-l-4 border-brand-500 bg-brand-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">Active Order</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{activeOrder.order_number}</p>
              {activeOrder.delivery_date && (
                <p className="text-xs text-slate-500 mt-1">
                  📅 Delivery: {format(new Date(activeOrder.delivery_date), "EEE, MMM d")}
                </p>
              )}
            </div>
            <span className={`badge ${STATUS_BADGE[activeOrder.status] || "badge-pending"}`}>
              {activeOrder.status}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <Link href="/order"
        className="flex items-center justify-center gap-2 p-5 rounded-xl bg-brand-600 text-white font-semibold text-base shadow-md hover:bg-brand-700 transition-colors">
        <Plus size={20} />
        Place New Order
      </Link>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Recent Orders</h3>
          <Link href="/my-orders" className="text-xs text-brand-600 hover:underline">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <ShoppingBag size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No orders yet</p>
            <p className="text-xs mt-1">Place your first water order above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/my-orders/${order.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow block">
                <ShoppingBag size={16} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(order.created_at), "MMM d, yyyy")}
                    {order.delivery_date && ` · Delivery: ${format(new Date(order.delivery_date), "MMM d")}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800">PKR {order.total_amount}</p>
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-pending"} mt-1`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
