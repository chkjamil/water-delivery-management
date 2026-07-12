// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "staff" | "delivery_person" | "customer";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Products & Inventory ─────────────────────────────────────────────────────

/**
 * product_type controls pricing and bottle-ledger behaviour:
 *  standard    — sealed small bottles (500ml, 1.5L). Single price, no ledger.
 *  refill      — water only. Customer brings their own bottle. Pays water_price.
 *  bundle      — bottle + water together. Pays bottle_price + water_price.
 *                Increments customer_bottles ledger on sale.
 *  bottle_only — empty container, no water. Pays bottle_price.
 *                Increments customer_bottles ledger on sale.
 */
export type ProductType = "standard" | "refill" | "bundle" | "bottle_only";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  standard:    "Standard",
  refill:      "Refill (water only)",
  bundle:      "Bundle (bottle + water)",
  bottle_only: "Bottle only",
};

export const PRODUCT_TYPE_COLOR: Record<ProductType, string> = {
  standard:    "bg-slate-100 text-slate-600",
  refill:      "bg-blue-100 text-blue-700",
  bundle:      "bg-green-100 text-green-700",
  bottle_only: "bg-amber-100 text-amber-700",
};

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  unit: string;            // e.g. "bottle", "refill", "crate"
  size_label: string;      // e.g. "5 Gallon", "1.5L", "500ml"
  product_type: ProductType;
  bottle_price: number;    // used for bundle & bottle_only
  water_price: number;     // used for bundle & refill
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** Customer bottle ownership ledger — one row per customer per trackable product */
export interface CustomerBottle {
  id: string;
  customer_id: string;
  customer?: Profile;
  product_id: string;
  product?: Product;
  quantity_owned: number;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity_in_stock: number;
  low_stock_threshold: number;
  empty_bottles_returned: number;
  last_restocked_at: string | null;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  product?: Product;
  transaction_type: "stock_in" | "stock_out" | "adjustment" | "return";
  quantity: number;
  note: string | null;
  performed_by: string;
  performed_by_profile?: Profile;
  created_at: string;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;           // "Home", "Office", etc.
  address_line1: string;
  address_line2: string | null;
  city: string;
  zone_id: string | null;
  zone?: DeliveryZone;
  is_default: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export type PaymentMethodPreference = "cash" | "monthly";

export interface Customer {
  id: string;              // references profiles.id
  profile?: Profile;
  credit_balance: number;
  total_spent: number;
  loyalty_points: number;
  notes: string | null;
  payment_method_preference: PaymentMethodPreference;
  addresses?: CustomerAddress[];
  created_at: string;
}

export type DeliveryFrequency = "weekly" | "biweekly" | "monthly";

export interface CustomerDeliveryPreference {
  id: string;
  customer_id: string;
  frequency: DeliveryFrequency;
  days_of_week: number[];   // 0=Sun..6=Sat; weekly/biweekly, 1-2 entries
  days_of_month: number[];  // 1-31, clamped to month length; monthly, 1-2 entries
  biweekly_anchor_date: string | null;
  address_id: string | null;
  time_slot_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerStandingItem {
  id: string;
  customer_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// ─── Delivery Zones & Time Slots ─────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  is_active: boolean;
  created_at: string;
}

// ─── Schedule engine ─────────────────────────────────────────────────────────
// A schedule_plan is scoped to one calendar month; schedule_plan_days is the
// day-of-week -> zone -> driver template that repeats every week of that
// month; schedule_overrides changes a single date without touching the
// template. See resolve_zone_driver() (022_schedule_engine.sql).

export interface SchedulePlan {
  id: string;
  plan_month: string;   // "YYYY-MM-01"
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SchedulePlanDay {
  id: string;
  plan_id: string;
  day_of_week: number;  // 0=Sun..6=Sat
  zone_id: string;
  zone?: DeliveryZone;
  driver_id: string | null;
  driver?: Profile;
  time_slot_id: string | null;
  time_slot?: TimeSlot;
  created_at: string;
}

export interface ScheduleOverride {
  id: string;
  override_date: string;
  zone_id: string;
  zone?: DeliveryZone;
  driver_id: string | null;
  driver?: Profile;
  time_slot_id: string | null;
  time_slot?: TimeSlot;
  is_skipped: boolean;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  label: string;           // "9am – 12pm"
  start_time: string;      // "09:00"
  end_time: string;        // "12:00"
  max_orders: number;
  is_active: boolean;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "en_route"
  | "delivered"
  | "cancelled"
  | "failed";

export type OrderType = "online" | "pos" | "admin";

export type PaymentMethod = "cash" | "card" | "easypaisa" | "jazzcash" | "bank" | "credit" | "online";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Profile;
  address_id: string | null;
  address?: CustomerAddress;
  order_type: OrderType;
  status: OrderStatus;
  items?: OrderItem[];

  // Delivery
  delivery_date: string | null;
  time_slot_id: string | null;
  time_slot?: TimeSlot;
  special_instructions: string | null;

  // Financials
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  amount_paid: number;

  // Meta
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Deliveries ──────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "loaded"
  | "en_route"
  | "delivered"
  | "failed"
  | "rescheduled";

export interface Delivery {
  id: string;
  order_id: string;
  order?: Order;
  driver_id: string | null;
  driver?: Profile;
  status: DeliveryStatus;
  assigned_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  failed_reason: string | null;
  empty_bottles_collected: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Delivery Stops (materialized daily schedule) ─────────────────────────────
// A delivery_stop is generated lazily from customer_delivery_preferences +
// resolve_zone_driver() for a given date. It has no order until marked
// 'completed' — see completeStop() in app/(dashboard)/my-stops/actions.ts.

export type DeliveryStopStatus = "pending" | "completed" | "skipped";

export interface DeliveryStopItem {
  id: string;
  stop_id: string;
  product_id: string;
  product?: Product;
  planned_qty: number;
  actual_qty: number | null;   // NULL until confirmed; deviation = actual_qty <> planned_qty
  unit_price: number;
  created_at: string;
}

export interface DeliveryStop {
  id: string;
  customer_id: string;
  customer?: Profile;
  stop_date: string;
  address_id: string | null;
  address?: CustomerAddress;
  zone_id: string | null;
  zone?: DeliveryZone;
  driver_id: string | null;
  driver?: Profile;
  time_slot_id: string | null;
  time_slot?: TimeSlot;
  status: DeliveryStopStatus;
  payment_method_snapshot: PaymentMethodPreference;
  order_id: string | null;
  delivery_id: string | null;
  cash_collected: boolean | null;
  skipped_reason: string | null;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  items?: DeliveryStopItem[];
}

// ─── Customer Credit Ledger ────────────────────────────────────────────────────
// credit_balance on customers is a running total; this ledger is the auditable
// trail behind it (both accruals — monthly/unpaid-cash deliveries, POS credit
// sales — and payments recorded against it).

export type CreditTransactionType = "accrual" | "payment";

export interface CustomerCreditTransaction {
  id: string;
  customer_id: string;
  type: CreditTransactionType;
  amount: number;
  related_order_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = "order_status_changed" | "delivery_assigned" | "low_stock_alert";

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  related_order_id: string | null;
  related_delivery_id: string | null;
  related_product_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  pending_deliveries: number;
  delivered_today: number;
  total_customers: number;
  low_stock_items: number;
  outstanding_dues: number;
  pending_orders: number;
  unassigned_deliveries: number;
  weekly_revenue: { date: string; revenue: number }[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
