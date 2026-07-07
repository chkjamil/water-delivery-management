"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, Package, Truck, AlertTriangle } from "lucide-react";
import { getNotifications, markNotificationRead } from "@/app/(dashboard)/notifications/actions";
import { timeAgo } from "@/lib/format";
import type { Notification, UserRole } from "@/types";
import { clsx } from "clsx";

interface HeaderProps {
  title: string;
  role: UserRole;
  onMenuClick: () => void;
}

const NOTIFICATION_ICON: Record<Notification["type"], React.ElementType> = {
  order_status_changed: Package,
  delivery_assigned:    Truck,
  low_stock_alert:      AlertTriangle,
};

const POLL_INTERVAL_MS = 45_000;

function notificationHref(n: Notification, role: UserRole): string | null {
  if (n.type === "order_status_changed" && n.related_order_id) {
    return role === "customer" ? `/my-orders/${n.related_order_id}` : `/orders/${n.related_order_id}`;
  }
  if (n.type === "delivery_assigned" && n.related_delivery_id) {
    return `/my-deliveries/${n.related_delivery_id}`;
  }
  if (n.type === "low_stock_alert") {
    return "/inventory";
  }
  return null;
}

export default function Header({ title, role, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [showBell, setShowBell]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await getNotifications();
      if (!cancelled && !res.error) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleNotificationClick(n: Notification) {
    setShowBell(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead(n.id);
    }
    const href = notificationHref(n, role);
    if (href) router.push(href);
  }

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

          <div ref={bellRef} className="relative">
            <button
              onClick={() => setShowBell((v) => !v)}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showBell && (
              <div className="absolute z-30 top-full mt-1 right-0 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Notifications</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => {
                      const Icon = NOTIFICATION_ICON[n.type];
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={clsx(
                            "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors",
                            !n.is_read && "bg-brand-50/60"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon size={14} className="text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx("text-sm text-slate-800 truncate", !n.is_read && "font-semibold")}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{n.message}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
