import type { UserRole } from "@/types";

// ─── Permission Definitions ───────────────────────────────────────────────────

export const PERMISSIONS = {
  // User management
  USERS_VIEW_ALL:       ["super_admin"],
  USERS_CREATE:         ["super_admin"],
  USERS_EDIT:           ["super_admin"],
  USERS_DELETE:         ["super_admin"],
  USERS_MANAGE_STAFF:   ["super_admin", "admin"],

  // Inventory
  INVENTORY_VIEW:       ["super_admin", "admin", "staff"],
  INVENTORY_MANAGE:     ["super_admin", "admin"],
  INVENTORY_STOCK_IN:   ["super_admin", "admin"],
  INVENTORY_REPORTS:    ["super_admin", "admin"],

  // Products
  PRODUCTS_VIEW:        ["super_admin", "admin", "staff", "customer"],
  PRODUCTS_MANAGE:      ["super_admin", "admin"],

  // POS
  POS_ACCESS:           ["super_admin", "admin", "staff"],
  POS_APPLY_DISCOUNT:   ["super_admin", "admin"],
  POS_VOID_TRANSACTION: ["super_admin", "admin"],
  POS_VIEW_SUMMARY:     ["super_admin", "admin", "staff"],

  // Orders
  ORDERS_VIEW_ALL:      ["super_admin", "admin"],
  ORDERS_VIEW_ASSIGNED: ["super_admin", "admin", "staff"],
  ORDERS_VIEW_OWN:      ["super_admin", "admin", "staff", "customer"],
  ORDERS_CREATE:        ["super_admin", "admin", "staff", "customer"],
  ORDERS_EDIT:          ["super_admin", "admin"],
  ORDERS_CANCEL:        ["super_admin", "admin"],
  ORDERS_FOR_CUSTOMER:  ["super_admin", "admin", "staff"],

  // Deliveries
  DELIVERIES_VIEW_ALL:  ["super_admin", "admin"],
  DELIVERIES_ASSIGN:    ["super_admin", "admin"],
  DELIVERIES_UPDATE:    ["super_admin", "admin", "staff"],
  DELIVERIES_VIEW_OWN:  ["super_admin", "admin", "staff"],

  // Customers
  CUSTOMERS_VIEW_ALL:   ["super_admin", "admin"],
  CUSTOMERS_VIEW_LIMITED: ["super_admin", "admin", "staff"],
  CUSTOMERS_MANAGE:     ["super_admin", "admin"],
  CUSTOMERS_NOTIFY:     ["super_admin", "admin"],

  // Reports & Financials
  REPORTS_FINANCIAL:    ["super_admin", "admin"],
  REPORTS_DELIVERY:     ["super_admin", "admin"],
  REPORTS_EXPORT:       ["super_admin", "admin"],

  // Settings
  SETTINGS_BUSINESS:    ["super_admin"],
  SETTINGS_ZONES:       ["super_admin", "admin"],
  SETTINGS_TIME_SLOTS:  ["super_admin", "admin"],
  SETTINGS_TAXES:       ["super_admin"],
  AUDIT_LOGS:           ["super_admin"],

  // Payments
  PAYMENTS_VIEW:        ["super_admin", "admin"],
  PAYMENTS_RECORD:      ["super_admin", "admin", "staff"],
  PAYMENTS_REFUND:      ["super_admin", "admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// ─── Role metadata (for display) ─────────────────────────────────────────────

export const ROLE_META: Record<UserRole, { label: string; color: string; icon: string }> = {
  super_admin: { label: "Super Admin", color: "amber",  icon: "👑" },
  admin:       { label: "Admin",       color: "red",    icon: "🛠️" },
  staff:       { label: "Staff",       color: "blue",   icon: "👷" },
  customer:    { label: "Customer",    color: "green",  icon: "👤" },
};

// ─── Nav items per role ───────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  // All roles
  { label: "Dashboard",    href: "/dashboard",           icon: "LayoutDashboard" },

  // Admin + Super Admin only
  { label: "Deliveries",   href: "/deliveries",          icon: "Truck",        permission: "DELIVERIES_VIEW_ALL" },
  { label: "Customers",    href: "/customers",           icon: "Users",        permission: "CUSTOMERS_VIEW_ALL" },
  { label: "Reports",      href: "/reports",             icon: "BarChart2",    permission: "REPORTS_FINANCIAL" },
  { label: "Settings",     href: "/settings",            icon: "Settings",     permission: "SETTINGS_BUSINESS" },

  // Admin + Super Admin + Staff (non-customer staff roles can view/search orders)
  { label: "Orders",       href: "/orders",              icon: "ShoppingBag",  permission: "ORDERS_VIEW_ASSIGNED" },
  { label: "Inventory",    href: "/inventory",           icon: "Package",      permission: "INVENTORY_VIEW" },
  { label: "POS",          href: "/pos",                 icon: "ShoppingCart", permission: "POS_ACCESS" },

  // Staff only
  { label: "My Deliveries", href: "/my-deliveries",     icon: "MapPin",       permission: "DELIVERIES_VIEW_OWN" },

  // Customer only
  { label: "Order Water",  href: "/order",               icon: "Plus",         permission: "ORDERS_VIEW_OWN" },
  { label: "My Orders",    href: "/my-orders",           icon: "ClipboardList",permission: "ORDERS_VIEW_OWN" },
];

// Routes that belong exclusively to customers — never shown to admin/staff
const CUSTOMER_ONLY_HREFS = ["/order", "/my-orders"];
// Routes that belong exclusively to staff drivers — never shown to admin/customer
const STAFF_ONLY_HREFS    = ["/my-deliveries"];
// Routes that belong exclusively to admin/super_admin — never shown to staff
const ADMIN_ONLY_HREFS    = ["/deliveries", "/customers", "/reports", "/settings"];

export function getNavForRole(role: UserRole): NavItem[] {
  const dashboardItem = NAV_ITEMS.find((n) => n.href === "/dashboard")!;
  const roleItems = NAV_ITEMS.filter(
    (n) => n.permission && hasPermission(role, n.permission)
  );

  // Customers: only see their own order-facing pages
  if (role === "customer") {
    return roleItems.filter((n) => CUSTOMER_ONLY_HREFS.includes(n.href));
  }

  // Staff: see Orders + Inventory + POS + My Deliveries — not the admin-only pages
  if (role === "staff") {
    return [dashboardItem, ...roleItems.filter(
      (n) => !CUSTOMER_ONLY_HREFS.includes(n.href)
           && !ADMIN_ONLY_HREFS.includes(n.href)
    )];
  }

  // Admin / Super Admin: see everything except customer-only and staff-only pages
  return [dashboardItem, ...roleItems.filter(
    (n) => !CUSTOMER_ONLY_HREFS.includes(n.href) && !STAFF_ONLY_HREFS.includes(n.href)
  )];
}
