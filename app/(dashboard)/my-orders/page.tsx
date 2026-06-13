import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Package, Clock, CheckCircle, XCircle, Truck, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders — AquaFlow" };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: ReactNode }> = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-700", icon: <Clock size={13} /> },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700",    icon: <Package size={13} /> },
  dispatched:{ label: "On the way",color: "bg-purple-100 text-purple-700",icon: <Truck size={13} /> },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700",  icon: <CheckCircle size={13} /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",      icon: <XCircle size={13} /> },
};

export default async function MyOrdersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, total_amount, payment_method, payment_status,
      delivery_date, delivery_address, created_at,
      order_items(
        quantity, unit_price,
        product:products(name, size_label)
      ),
      time_slot:time_slots(label)
    `)
    .eq("customer_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your deliveries and order history</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">💧</div>
          <p className="font-semibold text-slate-600">No orders yet</p>
          <p className="text-sm text-slate-400 mt-1">Place your first order to get started</p>
          <Link href="/order" className="btn-primary mt-4 inline-flex">Order Now</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const slot = Array.isArray(order.time_slot) ? order.time_slot[0] : order.time_slot;
            const items = order.order_items ?? [];

            return (
              <Link key={order.id} href={`/my-orders/${order.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                {/* Order header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Order #{order.order_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  {items.map((item: any, i: number) => {
                    const product = Array.isArray(item.product) ? item.product[0] : item.product;
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {product?.name ?? "Product"}
                          <span className="text-slate-400"> × {item.quantity}</span>
                        </span>
                        <span className="font-medium text-slate-700">
                          PKR {(item.unit_price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery info */}
                {order.delivery_date && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 mb-3">
                    🚚 {format(new Date(order.delivery_date + "T00:00:00"), "EEE, MMM d")}
                    {slot?.label && ` · ${slot.label}`}
                    {order.delivery_address && ` · ${order.delivery_address}`}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 capitalize">
                    {order.payment_method?.replace("_", " ")} ·{" "}
                    <span className={order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}>
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">PKR {order.total_amount.toLocaleString()}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
