"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface DataPoint { date: string; revenue: number }

interface Props {
  data: DataPoint[];
  type?: "bar" | "line";
}

function shortDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function fmtPKR(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export default function RevenueChart({ data, type = "bar" }: Props) {
  const chartData = data.map((d) => ({ ...d, label: shortDate(d.date) }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No data for this period
      </div>
    );
  }

  const common = {
    data: chartData,
    margin: { top: 4, right: 8, left: 0, bottom: 4 },
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      {type === "bar" ? (
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtPKR} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Revenue"]}
            labelFormatter={(l) => l}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtPKR} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Revenue"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
