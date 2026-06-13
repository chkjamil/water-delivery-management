"use client";

import { useState, useTransition } from "react";
import { Plus, Search, Users, AlertCircle, ShieldCheck } from "lucide-react";
import CustomerTable, { type CustomerRow } from "./CustomerTable";
import AddCustomerModal from "./AddCustomerModal";
import { getCustomers } from "../actions";
import toast from "react-hot-toast";

interface Props {
  initialCustomers: CustomerRow[];
}

export default function CustomerClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<"all" | "active" | "inactive" | "unverified">("all");
  const [showAdd,   setShowAdd]   = useState(false);
  const [refreshing, startRefresh] = useTransition();

  async function refresh() {
    startRefresh(async () => {
      const result = await getCustomers();
      if (result.error) { toast.error(result.error ?? "Failed to refresh"); return; }
      setCustomers(result.customers as CustomerRow[]);
    });
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.full_name.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || (c.phone ?? "").includes(q);

    const matchFilter =
      filter === "all"         ? true
      : filter === "active"    ? c.is_active
      : filter === "inactive"  ? !c.is_active
      : /* unverified */         !c.phone_verified;

    return matchSearch && matchFilter;
  });

  const totalActive     = customers.filter((c) => c.is_active).length;
  const totalUnverified = customers.filter((c) => !c.phone_verified).length;
  const totalBalance    = customers.reduce((s, c) => s + c.credit_balance, 0);

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{customers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalActive}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Unverified Phone</p>
          <p className={`text-2xl font-bold mt-1 ${totalUnverified > 0 ? "text-amber-600" : "text-slate-800"}`}>
            {totalUnverified}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Outstanding Credit</p>
          <p className={`text-2xl font-bold mt-1 ${totalBalance > 0 ? "text-red-600" : "text-slate-800"}`}>
            PKR {totalBalance >= 1000 ? `${(totalBalance / 1000).toFixed(1)}k` : totalBalance.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Filters + Search + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
          {([
            { value: "all",        label: `All (${customers.length})` },
            { value: "active",     label: "Active"    },
            { value: "inactive",   label: "Inactive"  },
            { value: "unverified", label: "⚠ Unverified" },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary btn-sm ml-auto"
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Table */}
      {refreshing ? (
        <div className="card p-10 text-center text-slate-400 animate-pulse">Refreshing…</div>
      ) : (
        <CustomerTable customers={filtered} onRefresh={refresh} />
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refresh(); }}
        />
      )}
    </div>
  );
}
