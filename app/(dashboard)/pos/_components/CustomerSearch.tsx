"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Search, User, X, UserCheck } from "lucide-react";
import { searchCustomers } from "../actions";
import type { POSCustomer } from "./POSClient";

interface Props {
  value:    POSCustomer | null;
  onChange: (c: POSCustomer | null) => void;
}

export default function CustomerSearch({ value, onChange }: Props) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<POSCustomer[]>([]);
  const [open,      setOpen]      = useState(false);
  const [isPending, start]        = useTransition();
  const ref                       = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    start(async () => {
      const res = await searchCustomers(q);
      setResults(res.customers as POSCustomer[]);
      setOpen(true);
    });
  }

  function select(c: POSCustomer) {
    onChange(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // If a customer is already selected, show compact badge
  if (value) {
    return (
      <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <UserCheck size={14} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{value.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{value.phone ?? value.email ?? "No contact"}</p>
        </div>
        {value.balance > 0 && (
          <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            Owes PKR {value.balance.toLocaleString()}
          </span>
        )}
        <button onClick={clear} className="p-1 text-slate-400 hover:text-slate-600 ml-1 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-8 text-sm"
          placeholder="Search customer (name / phone)…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 animate-pulse">…</span>
        )}
      </div>

      {/* Walk-in label */}
      {!query && (
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <User size={11} /> Walk-in (no account) — leave empty
        </p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => select(c)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{c.phone ?? c.email ?? "No contact"}</p>
              </div>
              {c.balance > 0 && (
                <span className="text-xs text-red-500 font-medium">PKR {c.balance.toLocaleString()} owed</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !isPending && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
          No customer found for "{query}"
        </div>
      )}
    </div>
  );
}
