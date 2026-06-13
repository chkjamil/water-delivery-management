"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import UpdateStatusModal from "./UpdateStatusModal";
import RecordPaymentModal from "./RecordPaymentModal";
import CancelOrderModal from "./CancelOrderModal";
import { formatPKR, formatDateTime } from "@/lib/format";
import { getOrders } from "../actions";
import toast from "react-hot-toast";

export type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  delivery_date: string | null;
  delivery_address: string | null;
  amount_paid: number;
  discount_amount: number;
  created_at: string;
  customer: { id: string; full_name: string; email: string; phone: string | null } | null;
  time_slot: { label: string } | null;
};

type ModalState =
  | { type: "none" }
  | { type: "status"; order: OrderRow }
  | { type: "payment"; order: OrderRow }
  | { type: "cancel"; order: OrderRow };

const STATUS_FILTERS = ["all", "pending", "confirmed", "dispatched", "en_route", "delivered", "cancelled", "failed"] as const;

interface Props {
  initialOrders: OrderRow[];
  canEdit: boolean;
}

export default function OrdersClient({ initialOrders, canEdit }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payFilter, setPayFilter] = useState<string>("all");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [refreshing, startRefresh] = useTransition();

  function refresh() {
    startRefresh(async () => {
      const res = await getOrders();
      if (res.error) { toast.error("Failed to refresh"); return; }
      setOrders((res.orders as OrderRow[]).map((o) => ({
        ...o,
        customer: Array.isArray(o.customer) ? (o.customer[0] ?? null) : o.customer ?? null,
        time_slot: Array.isArray(o.time_slot) ? (o.time_slot[0] ?? null) : o.time_slot ?? null,
      })));
    });
  }

  function patchOrder(updated: OrderRow) {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (payFilter !== "all") list = list.filter((o) => o.payment_status === payFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer?.full_name.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, payFilter, search]);

  const todayRevenue = orders
    .filter((o) => o.status !== "cancelled" && o.created_at.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: orders.length, color: "bg-brand-50 text-brand-700" },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length, color: "bg-yellow-50 text-yellow-700" },
          { label: "Today Revenue", value: formatPKR(todayRevenue, true), color: "bg-green-50 text-green-700" },
          { label: "Unpaid", value: orders.filter((o) => o.payment_status === "unpaid" && o.status !== "cancelled").length, color: "bg-red-50 text-red-700" },
        ].map((s) => (
          <div key={s.label} className="card p-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color} rounded px-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer…"
            className="input pl-9 text-sm"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "All Status" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {["all", "unpaid", "partial", "paid"].map((s) => (
            <button
              key={s}
              onClick={() => setPayFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                payFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "All Pay" : s}
            </button>
          ))}
        </div>

        <button onClick={refresh} disabled={refreshing} className="btn-ghost btn-sm ml-auto">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-semibold text-slate-600">No orders found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Order #", "Customer", "Status", "Delivery", "Payment", "Total", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`} className="font-bold text-brand-600 hover:underline">
                          #{order.order_number}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {order.customer ? (
                          <Link href={`/customers/${order.customer.id}`} className="font-medium text-slate-800 hover:underline">
                            {order.customer.full_name}
                          </Link>
                        ) : <span className="text-slate-400 italic">Walk-in</span>}
                        {order.customer?.phone && <p className="text-xs text-slate-400">{order.customer.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} type="order" />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {order.delivery_date
                          ? <>{order.delivery_date}<br /><span className="text-slate-400">{order.time_slot?.label ?? ""}</span></>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.payment_status} type="payment" />
                        {order.payment_method && (
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">{order.payment_method.replace("_", " ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {formatPKR(order.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && order.status !== "cancelled" && order.status !== "delivered" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setModal({ type: "status", order })}
                              className="btn-ghost btn-sm text-xs"
                            >
                              Status
                            </button>
                            {order.payment_status !== "paid" && (
                              <button
                                onClick={() => setModal({ type: "payment", order })}
                                className="btn-ghost btn-sm text-xs text-green-600"
                              >
                                Pay
                              </button>
                            )}
                            {["pending", "confirmed"].includes(order.status) && (
                              <button
                                onClick={() => setModal({ type: "cancel", order })}
                                className="btn-ghost btn-sm text-xs text-red-500"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                        <Link href={`/orders/${order.id}`} className="text-xs text-brand-600 hover:underline block mt-1">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((order) => (
              <div key={order.id} className="card p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-bold text-brand-600 hover:underline text-sm">
                      #{order.order_number}
                    </Link>
                    <p className="text-xs text-slate-400">{formatDateTime(order.created_at)}</p>
                  </div>
                  <StatusBadge status={order.status} type="order" />
                </div>
                <p className="text-sm font-medium text-slate-800">{order.customer?.full_name ?? "Walk-in"}</p>
                <div className="flex items-center justify-between mt-2">
                  <StatusBadge status={order.payment_status} type="payment" />
                  <span className="font-bold text-slate-800">{formatPKR(order.total_amount)}</span>
                </div>
                {canEdit && order.status !== "cancelled" && order.status !== "delivered" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => setModal({ type: "status", order })} className="btn-secondary btn-sm flex-1 justify-center text-xs">Update Status</button>
                    {order.payment_status !== "paid" && (
                      <button onClick={() => setModal({ type: "payment", order })} className="btn-secondary btn-sm text-green-600 text-xs">Pay</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {modal.type === "status" && (
        <UpdateStatusModal order={modal.order} onClose={() => setModal({ type: "none" })} onUpdated={patchOrder} />
      )}
      {modal.type === "payment" && (
        <RecordPaymentModal order={modal.order} onClose={() => setModal({ type: "none" })} onUpdated={patchOrder} />
      )}
      {modal.type === "cancel" && (
        <CancelOrderModal order={modal.order} onClose={() => setModal({ type: "none" })} onUpdated={patchOrder} />
      )}
    </div>
  );
}
