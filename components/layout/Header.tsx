"use client";

import { useState } from "react";
import { Menu, Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3 safe-top">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      {!showSearch && (
        <h1 className="flex-1 font-semibold text-slate-800 text-base truncate">{title}</h1>
      )}

      {/* Search (mobile — expands inline) */}
      {showSearch ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            autoFocus
            className="input py-1.5 text-sm"
            placeholder="Search orders, customers…"
            onBlur={() => setShowSearch(false)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setShowSearch(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Search">
            <Search size={18} />
          </button>
          <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      )}
    </header>
  );
}
