"use client";

import Link from "next/link";
import { TrendingUp, Package, Truck, Users, AlertTriangle, ShoppingBag, DollarSign, ClipboardList } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { UserRole, DashboardStats } from "@/types";
import { formatPKR } from "@/lib/format";

interface Props {
  stats: DashboardStats;
  role: UserRole;
  fullName: string;
}

function StatCard({
  icon: Icon, label, value, sub, color, href, sparkline,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; href?: string;
  sparkline?: { date: string; revenue: number }[];
}) {
  const content = (
    <div className="card p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-xl ${color} flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-2 -mx-1">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={sparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Tooltip
                  formatter={(v: number) => [formatPKR(v), "Revenue"]}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0", padding: "2px 8px" }}
                  labelFormatter={() => ""}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboard({ stats, role, fullName }: Props) {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Good {getGreeting()}, {fullName.split(" ")[0]} 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag}    label="Today's Orders"       value={stats.today_orders}                             color="bg-brand-600"  href="/orders" />
        <StatCard icon={TrendingUp}     label="Today's Revenue"      value={formatPKR(stats.today_revenue, true)}           color="bg-green-500"  sparkline={stats.weekly_revenue} />
        <StatCard icon={ClipboardList}  label="Pending Orders"       value={stats.pending_orders}                           color="bg-yellow-500" href="/orders" />
        <StatCard icon={Truck}          label="Pending Deliveries"   value={stats.pending_deliveries}                       color="bg-amber-500"  href="/deliveries" />
        <StatCard icon={Truck}          label="Delivered Today"      value={stats.delivered_today}                          color="bg-teal-500"   href="/deliveries" />
        <StatCard icon={Truck}          label="Unassigned"           value={stats.unassigned_deliveries}                    color={stats.unassigned_deliveries > 0 ? "bg-red-400" : "bg-slate-400"} href="/deliveries" />
        <StatCard icon={Users}          label="Total Customers"      value={stats.total_customers}                          color="bg-purple-500" href="/customers" />
        <StatCard icon={Package}        label="Low Stock Items"      value={stats.low_stock_items}                          color={stats.low_stock_items > 0 ? "bg-red-500" : "bg-slate-400"} href="/inventory" />
        <StatCard icon={DollarSign}     label="Outstanding Dues"     value={formatPKR(stats.outstanding_dues, true)}        color="bg-orange-500" href="/reports" sub="credit balances" />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/pos"           className="btn-primary">🛒 Open POS</Link>
          <Link href="/orders"        className="btn-secondary">📋 View Orders</Link>
          <Link href="/deliveries"    className="btn-secondary">🚚 Deliveries</Link>
          <Link href="/inventory"     className="btn-secondary">📦 Inventory</Link>
          <Link href="/reports"       className="btn-secondary">📊 Reports</Link>
          {role === "super_admin" && (
            <Link href="/settings"    className="btn-secondary">⚙️ Settings</Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {stats.unassigned_deliveries > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Unassigned deliveries</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {stats.unassigned_deliveries} deliver{stats.unassigned_deliveries > 1 ? "ies need" : "y needs"} a driver.{" "}
              <Link href="/deliveries" className="underline font-medium">Assign now →</Link>
            </p>
          </div>
        </div>
      )}

      {stats.low_stock_items > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Low stock alert</p>
            <p className="text-sm text-red-600 mt-0.5">
              {stats.low_stock_items} product{stats.low_stock_items > 1 ? "s are" : " is"} below the minimum threshold.{" "}
              <Link href="/inventory" className="underline font-medium">View inventory →</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
