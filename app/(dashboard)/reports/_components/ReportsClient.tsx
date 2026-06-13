"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import RevenueChart from "./RevenueChart";
import { formatPKR } from "@/lib/format";
import {
  getRevenueData,
  getOrderVolumeData,
  getTopCustomers,
  getProductBreakdown,
  getOutstandingDues,
  exportOrdersCSV,
} from "../actions";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type RevenuePoint = { date: string; revenue: number };
type VolumePoint = { date: string; count: number };
type TopCustomer = { id: string; full_name: string; phone: string | null; email: string; total: number; count: number };
type ProductBreakdown = { name: string; size_label: string; qty: number; revenue: number };
type DueRow = { id: string; full_name: string; phone: string | null; email: string; credit_balance: number };

type Tab = "revenue" | "orders" | "customers" | "products" | "dues";

interface Props {
  initialRevenue: RevenuePoint[];
  initialVolume: VolumePoint[];
  initialTopCustomers: TopCustomer[];
  initialProducts: ProductBreakdown[];
  initialDues: DueRow[];
  defaultStart: string;
  defaultEnd: string;
}

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

export default function ReportsClient({ initialRevenue, initialVolume, initialTopCustomers, initialProducts, initialDues, defaultStart, defaultEnd }: Props) {
  const [tab, setTab] = useState<Tab>("revenue");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [revenue, setRevenue] = useState(initialRevenue);
  const [volume, setVolume] = useState(initialVolume);
  const [topCustomers, setTopCustomers] = useState(initialTopCustomers);
  const [products, setProducts] = useState(initialProducts);
  const [dues, setDues] = useState(initialDues);
  const [loading, startLoad] = useTransition();
  const [exporting, startExport] = useTransition();

  function applyRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setStartDate(toDateStr(start));
    setEndDate(toDateStr(end));
    fetchAll(toDateStr(start), toDateStr(end));
  }

  function fetchAll(s: string, e: string) {
    startLoad(async () => {
      const [r, v, c, p] = await Promise.all([
        getRevenueData(s, e),
        getOrderVolumeData(s, e),
        getTopCustomers(10, s, e),
        getProductBreakdown(s, e),
      ]);
      if (!r.error) setRevenue(r.data as RevenuePoint[]);
      if (!v.error) setVolume(v.data as VolumePoint[]);
      if (!c.error) setTopCustomers(c.data as TopCustomer[]);
      if (!p.error) setProducts(p.data as ProductBreakdown[]);
    });
  }

  function handleExport() {
    startExport(async () => {
      const res = await exportOrdersCSV(startDate, endDate);
      if (res.error || !res.csv) { toast.error("Export failed"); return; }
      const blob = new Blob([res.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    });
  }

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = volume.reduce((s, v) => s + v.count, 0);
  const totalDues = dues.reduce((s, d) => s + d.credit_balance, 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "orders", label: "Orders" },
    { key: "customers", label: "Top Customers" },
    { key: "products", label: "Products" },
    { key: "dues", label: "Dues" },
  ];

  return (
    <div className="space-y-5">
      {/* Date range */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => applyRange(r.days)}
              disabled={loading}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              Last {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input text-sm h-8 py-0 px-2" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input text-sm h-8 py-0 px-2" />
          <button
            onClick={() => fetchAll(startDate, endDate)}
            disabled={loading}
            className="btn-primary btn-sm"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary btn-sm ml-auto gap-1.5">
          <Download size={13} /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-slate-500">Total Revenue</p><p className="text-2xl font-bold text-green-600 mt-1">{formatPKR(totalRevenue, true)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Total Orders</p><p className="text-2xl font-bold text-brand-600 mt-1">{totalOrders}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Outstanding Dues</p><p className={`text-2xl font-bold mt-1 ${totalDues > 0 ? "text-red-600" : "text-slate-600"}`}>{formatPKR(totalDues, true)}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "revenue" && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Revenue by Day</p>
          <RevenueChart data={revenue} type="bar" />
        </div>
      )}

      {tab === "orders" && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Order Volume by Day</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={volume.map((d) => ({ ...d, label: new Date(d.date + "T00:00:00").toLocaleDateString("en-PK", { month: "short", day: "numeric" }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "customers" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Top Customers by Spend</p>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["#", "Customer", "Orders", "Total Spend"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.phone ?? c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.count}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{formatPKR(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "products" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Product Sales Breakdown</p>
          </div>
          {products.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Product", "Units Sold", "Revenue"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.size_label}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.qty}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{formatPKR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "dues" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-700">Outstanding Credit Dues</p>
            <p className="text-sm font-bold text-red-600">{formatPKR(totalDues)}</p>
          </div>
          {dues.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-green-600 font-semibold">All clear! No outstanding dues.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Customer", "Phone", "Outstanding Balance"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dues.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{d.full_name}</p>
                      <p className="text-xs text-slate-400">{d.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.phone ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{formatPKR(d.credit_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
