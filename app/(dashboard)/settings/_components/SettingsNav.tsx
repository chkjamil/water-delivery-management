"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { UserRole } from "@/types";
import { Building2, MapPin, Clock, Users, Bell, User, CreditCard } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  description: string;
}

const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/business",      label: "Business",          icon: Building2, roles: ["super_admin"],           description: "Name, logo, contact"  },
  { href: "/settings/payment-methods",label: "Payment Methods",   icon: CreditCard,roles: ["super_admin", "admin"],   description: "Enable / disable options" },
  { href: "/settings/zones",         label: "Delivery Zones",    icon: MapPin,    roles: ["super_admin", "admin"],   description: "Areas & fees"         },
  { href: "/settings/time-slots",    label: "Time Slots",        icon: Clock,     roles: ["super_admin", "admin"],   description: "Delivery windows"     },
  { href: "/settings/users",         label: "Users & Roles",     icon: Users,     roles: ["super_admin"],           description: "Staff & permissions"  },
  { href: "/settings/notifications", label: "Notifications",     icon: Bell,      roles: ["super_admin", "admin"],   description: "Email & SMS alerts"   },
  { href: "/settings/profile",       label: "My Profile",        icon: User,      roles: ["super_admin", "admin"],   description: "Password & details"   },
];

export default function SettingsNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = SETTINGS_NAV.filter((n) => n.roles.includes(role));

  return (
    <nav className="lg:w-56 flex-shrink-0">
      <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
        {items.map(({ href, label, icon: Icon, description }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-shrink-0">
              <Link
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon size={16} className={active ? "text-brand-600" : "text-slate-400"} />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
