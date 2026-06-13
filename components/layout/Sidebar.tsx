"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { UserRole } from "@/types";
import { getNavForRole } from "@/lib/permissions";
import {
  LayoutDashboard, ShoppingBag, Truck, Package, ShoppingCart,
  Users, BarChart2, Settings, MapPin, ClipboardList, Plus, X,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingBag, Truck, Package, ShoppingCart,
  Users, BarChart2, Settings, MapPin, ClipboardList, Plus,
};

interface SidebarProps {
  role: UserRole;
  fullName: string;
  email: string;
  onClose?: () => void;
}

export default function Sidebar({ role, fullName, email, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavForRole(role);

  const roleColors: Record<UserRole, string> = {
    super_admin: "bg-amber-100 text-amber-800",
    admin:       "bg-red-100 text-red-800",
    staff:       "bg-blue-100 text-blue-800",
    customer:    "bg-green-100 text-green-800",
  };
  const roleLabels: Record<UserRole, string> = {
    super_admin: "👑 Super Admin",
    admin:       "🛠️ Admin",
    staff:       "👷 Staff",
    customer:    "👤 Customer",
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💧</span>
          <span className="font-bold text-brand-600 text-lg">AquaFlow</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 truncate">{fullName}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className={clsx("badge text-xs", roleColors[role])}>{roleLabels[role]}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon size={18} className={isActive ? "text-brand-600" : "text-slate-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-1">
        <Link href="/profile" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Settings size={16} className="text-slate-400" />
          Profile & Settings
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
