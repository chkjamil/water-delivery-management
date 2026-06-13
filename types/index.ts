// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "staff" | "customer";

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

export interface Customer {
  id: string;              // references profiles.id
  profile?: Profile;
  credit_balance: number;
  total_spent: number;
  loyalty_points: number;
  notes: string | null;
  addresses?: CustomerAddress[];
  created_at: string;
}

// ─── Delivery Zones & Time Slots ─────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  is_active: boolean;
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

export type PaymentMethod = "cash" | "card" | "easypaisa" | "jazzcash" | "bank" | "credit";
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
