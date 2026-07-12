"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Plus, ShoppingBag, CalendarClock, MapPin, Wallet, Package, Paperclip } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface Order { id: string; order_number: string; status: string; payment_status: string; total_amount: number; delivery_date: string | null; created_at: string; }
interface DeliveryPreference { frequency: "weekly" | "biweekly" | "monthly"; days_of_week: number[]; days_of_month: number[]; is_active: boolean; }
interface Address { id: string; label: string; address_line1: string; address_line2: string | null; city: string; is_default: boolean; }
interface BottleRow { quantity_owned: number; product: { name: string; size_label: string } | null; }
interface CreditTransaction { id: string; type: "accrual" | "payment"; amount: number; note: string | null; created_at: string; evidence_url: string | null; }

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending", confirmed: "badge-confirmed", dispatched: "badge-dispatch",
  en_route: "badge-enroute", delivered: "badge-delivered", cancelled: "badge-cancelled",
};

const DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function describeSchedule(pref: DeliveryPreference | null): string | null {
  if (!pref || !pref.is_active) return null;
  if (pref.frequency === "monthly") {
    if (pref.days_of_month.length === 0) return null;
    return `Monthly, on the ${pref.days_of_month.map(ordinal).join(" & ")}`;
  }
  if (pref.days_of_week.length === 0) return null;
  const days = pref.days_of_week.map((d) => DOW_LABELS[d]).join(" & ");
  return pref.frequency === "biweekly" ? `Every 2 weeks on ${days}` : `Every ${days}`;
}

export default function CustomerDashboard({
  orders, fullName, deliveryPreference, addresses, paymentPreference, creditBalance, bottles, creditTransactions,
}: {
  orders: Order[];
  fullName: string;
  deliveryPreference: DeliveryPreference | null;
  addresses: Address[];
  paymentPreference: "cash" | "monthly";
  creditBalance: number;
  bottles: BottleRow[];
  creditTransactions: CreditTransaction[];
}) {
  const activeOrder = orders.find((o) => !["delivered", "cancelled", "failed"].includes(o.status));
  const scheduleText = describeSchedule(deliveryPreference);
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Hi, {fullName.split(" ")[0]}! 👋</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your water deliveries.</p>
      </div>

      {/* Recurring delivery schedule summary */}
      {(scheduleText || defaultAddress || paymentPreference === "monthly") && (
        <div className="card p-4 space-y-2">
          {scheduleText && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <CalendarClock size={15} className="text-brand-600 flex-shrink-0" />
              <span>{scheduleText}</span>
            </div>
          )}
          {defaultAddress && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <MapPin size={15} className="text-brand-600 flex-shrink-0" />
              <span>{defaultAddress.address_line1}, {defaultAddress.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Wallet size={15} className="text-brand-600 flex-shrink-0" />
            <span>
              {paymentPreference === "monthly" ? "Monthly account" : "Cash on delivery"}
              {creditBalance > 0 && <span className="text-red-600 font-medium"> · PKR {creditBalance.toLocaleString()} due</span>}
            </span>
          </div>
          {bottles.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-slate-700 pt-1 border-t border-slate-100">
              <Package size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <span>
                <span className="text-xs text-slate-400 block">Bottles currently at your address (not part of the amount due):</span>
                {bottles.map((b) => `${b.product?.name ?? "Bottle"} x${b.quantity_owned}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment/credit transaction history */}
      {creditTransactions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h3>
          <div className="card divide-y divide-slate-50">
            {creditTransactions.map((t) => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className={t.type === "accrual" ? "text-red-600" : "text-green-600"}>
                    {t.type === "accrual" ? "+ " : "− "}PKR {t.amount.toLocaleString()}
                  </span>
                  {t.note && <span className="text-xs text-slate-400 ml-2">{t.note}</span>}
                  {t.evidence_url && (
                    <a href={t.evidence_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline ml-2 inline-flex items-center gap-0.5">
                      <Paperclip size={11} /> receipt
                    </a>
                  )}
                </div>
                <span className="text-xs text-slate-400">{format(new Date(t.created_at), "MMM d, yyyy")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex flex-col items-end gap-1">
              <span className={`badge ${STATUS_BADGE[activeOrder.status] || "badge-pending"}`}>
                {activeOrder.status}
              </span>
              <StatusBadge status={activeOrder.payment_status} type="payment" />
            </div>
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
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-slate-800">PKR {order.total_amount}</p>
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-pending"}`}>
                    {order.status}
                  </span>
                  <StatusBadge status={order.payment_status} type="payment" className="block" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
