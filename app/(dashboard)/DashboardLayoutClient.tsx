"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { UserRole } from "@/types";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/orders":        "Orders",
  "/deliveries":    "Deliveries",
  "/inventory":     "Inventory",
  "/pos":           "Point of Sale",
  "/customers":     "Customers",
  "/reports":       "Reports",
  "/settings":      "Settings",
  "/my-deliveries": "My Deliveries",
  "/my-orders":     "My Orders",
  "/order":         "Order Water",
  "/profile":       "My Profile",
};

interface Props {
  role: UserRole;
  fullName: string;
  email: string;
  children: React.ReactNode;
}

export default function DashboardLayoutClient({ role, fullName, email, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const title = PAGE_TITLES[pathname] || "AquaFlow";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar role={role} fullName={fullName} email={email} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-64">
            <Sidebar
              role={role}
              fullName={fullName}
              email={email}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
