"use client";

import { useState } from "react";
import { format } from "date-fns";
import { PackagePlus, SlidersHorizontal, RotateCcw, Archive, User } from "lucide-react";
import type { TransactionRow } from "./InventoryClient";

interface Props {
  transactions: TransactionRow[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  stock_in:   { label: "Stock In",   color: "bg-green-100 text-green-700",  icon: <PackagePlus size={13} /> },
  adjustment: { label: "Adjustment", color: "bg-blue-100 text-blue-700",    icon: <SlidersHorizontal size={13} /> },
  return:     { label: "Return",     color: "bg-purple-100 text-purple-700", icon: <RotateCcw size={13} /> },
  sale:       { label: "Sale",       color: "bg-amber-100 text-amber-700",  icon: <Archive size={13} /> },
};

const PAGE_SIZE = 20;

export default function TransactionLog({ transactions }: Props) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<string>("all");
  const [page,   setPage]     = useState(1);

  const filtered = transactions.filter((tx) => {
    const matchType    = filter === "all" || tx.transaction_type === filter;
    const searchLower  = search.toLowerCase();
    const matchSearch  = !search
      || tx.product?.name.toLowerCase().includes(searchLower)
      || tx.product?.sku.toLowerCase().includes(searchLower)
      || (tx.note ?? "").toLowerCase().includes(searchLower);
    return matchType && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(f: string) {
    setFilter(f);
    setPage(1);
  }

  if (transactions.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400">
        <SlidersHorizontal size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No transactions yet</p>
        <p className="text-sm mt-1">Stock-ins, adjustments, and returns will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input flex-1 min-w-[180px] max-w-xs"
          placeholder="Search product or note…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
          {(["all", "stock_in", "adjustment", "return", "sale"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleFilterChange(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filter === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "all" ? "All" : (TYPE_CONFIG[t]?.label ?? t)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="card hidden md:block overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No transactions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((tx) => {
                  const cfg = TYPE_CONFIG[tx.transaction_type] ?? {
                    label: tx.transaction_type, color: "bg-slate-100 text-slate-600", icon: null,
                  };
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                        <span className="block text-slate-400">{format(new Date(tx.created_at), "h:mm a")}</span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.product ? (
                          <>
                            <p className="font-medium text-slate-800 text-xs">{tx.product.name}</p>
                            <p className="text-xs text-slate-400">{tx.product.sku}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${
                          tx.transaction_type === "stock_in" ? "text-green-700"
                          : tx.transaction_type === "return"  ? "text-purple-700"
                          : tx.transaction_type === "sale"    ? "text-red-600"
                          : "text-blue-700"
                        }`}>
                          {tx.transaction_type === "sale" ? "−" : "+"}{tx.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                        {tx.note ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {tx.performed_by_profile ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                              <User size={10} className="text-brand-600" />
                            </div>
                            <span className="text-xs text-slate-600 truncate max-w-[100px]">
                              {tx.performed_by_profile.full_name || tx.performed_by_profile.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">System</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No transactions match your filters.</div>
        ) : (
          paginated.map((tx) => {
            const cfg = TYPE_CONFIG[tx.transaction_type] ?? {
              label: tx.transaction_type, color: "bg-slate-100 text-slate-600", icon: null,
            };
            return (
              <div key={tx.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{tx.product?.name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">{tx.product?.sku} · {format(new Date(tx.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <span className={`text-base font-bold ${
                      tx.transaction_type === "stock_in" ? "text-green-700"
                      : tx.transaction_type === "return"  ? "text-purple-700"
                      : tx.transaction_type === "sale"    ? "text-red-600"
                      : "text-blue-700"
                    }`}>
                      {tx.transaction_type === "sale" ? "−" : "+"}{tx.quantity}
                    </span>
                  </div>
                </div>
                {tx.note && <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">{tx.note}</p>}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary btn-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
