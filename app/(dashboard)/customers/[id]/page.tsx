import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, ShieldCheck, ShieldX, MapPin, Package } from "lucide-react";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  if (!["super_admin", "admin", "staff"].includes(me?.role ?? "")) redirect("/dashboard");

  // Fetch profile + customer data
  const { data: profile } = await supabase
    .from("profiles")
    .select(`id, full_name, email, phone, is_active, phone_verified, created_at,
             customers(credit_balance, total_spent, loyalty_points, notes)`)
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (!profile) notFound();

  const c = Array.isArray(profile.customers) ? profile.customers[0] : profile.customers;

  // Fetch addresses
  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select("id, label, address_line1, address_line2, city, is_default")
    .eq("customer_id", id)
    .order("is_default", { ascending: false });

  // Fetch recent orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, payment_status, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch bottle ledger
  const { data: bottles } = await supabase
    .from("customer_bottles")
    .select("quantity_owned, updated_at, product:products(name, size_label)")
    .eq("customer_id", id);

  const STATUS_COLOR: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Back */}
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
        <ArrowLeft size={14} /> All Customers
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl flex-shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{profile.full_name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Mail size={11} />{profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Phone size={11} />{profile.phone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`badge text-xs ${profile.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {profile.is_active ? "Active" : "Inactive"}
                </span>
                {profile.phone_verified ? (
                  <span className="badge bg-green-100 text-green-700 text-xs inline-flex items-center gap-1">
                    <ShieldCheck size={10} /> Phone verified
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700 text-xs inline-flex items-center gap-1">
                    <ShieldX size={10} /> Phone unverified
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  Member since {format(new Date(profile.created_at), "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400">Total Spent</p>
              <p className="text-lg font-bold text-slate-800">PKR {(c?.total_spent ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Credit Owed</p>
              <p className={`text-lg font-bold ${(c?.credit_balance ?? 0) > 0 ? "text-red-600" : "text-slate-800"}`}>
                PKR {(c?.credit_balance ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Loyalty Pts</p>
              <p className="text-lg font-bold text-brand-700">{c?.loyalty_points ?? 0}</p>
            </div>
          </div>
        </div>

        {c?.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3">
            <span className="font-medium text-slate-500 text-xs uppercase tracking-wide">Note: </span>
            {c.notes}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* Addresses */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
              <MapPin size={15} className="text-brand-600" /> Delivery Addresses
            </h2>
          </div>
          <div className="card-body p-0">
            {addresses && addresses.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {addresses.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{a.label}</span>
                      {a.is_default && <span className="badge bg-brand-100 text-brand-700 text-xs">Default</span>}
                    </div>
                    <p className="text-sm text-slate-600">{a.address_line1}</p>
                    {a.address_line2 && <p className="text-xs text-slate-400">{a.address_line2}</p>}
                    <p className="text-xs text-slate-400">{a.city}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-400">No addresses saved</p>
            )}
          </div>
        </div>

        {/* Bottle ledger */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
              🧴 Bottle Ledger
            </h2>
          </div>
          <div className="card-body p-0">
            {bottles && bottles.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {bottles.map((b, i) => {
                  const prod = Array.isArray(b.product) ? b.product[0] : b.product;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{prod?.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400">{prod?.size_label}</p>
                      </div>
                      <span className="text-lg font-bold text-brand-700">{b.quantity_owned}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-400">No bottles on ledger</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <Package size={15} className="text-brand-600" /> Recent Orders
          </h2>
        </div>
        <div className="card-body p-0">
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-semibold uppercase">Order #</th>
                    <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase">Total</th>
                    <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-brand-600">#{o.order_number}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(o.created_at), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${STATUS_COLOR[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">PKR {o.total_amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {o.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-slate-400">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
