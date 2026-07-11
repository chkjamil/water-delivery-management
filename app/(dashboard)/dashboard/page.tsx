import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import AdminDashboard from "./_components/AdminDashboard";
import StaffDashboard from "./_components/StaffDashboard";
import CustomerDashboard from "./_components/CustomerDashboard";

export default async function DashboardPage() {
  // createClient() is async in Next.js 15
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole;

  if (role === "super_admin" || role === "admin") {
    const today = new Date().toISOString().split("T")[0];

    const [ordersRes, deliveriesRes, inventoryRes, customersRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, status, total_amount, payment_status, created_at")
        .gte("created_at", today),
      supabase.from("deliveries").select("id, status"),
      supabase.from("low_stock_products").select("id"),
      supabase.from("profiles").select("id").eq("role", "customer"),
    ]);

    const todayOrders = ordersRes.data || [];
    const deliveries  = deliveriesRes.data || [];
    const lowStock    = inventoryRes.data || [];
    const customers   = customersRes.data || [];

    // Fetch weekly revenue (last 7 days) for sparkline
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const { data: weeklyOrders } = await supabase
      .from("orders")
      .select("created_at, total_amount, status")
      .neq("status", "cancelled")
      .gte("created_at", weekStart.toISOString().split("T")[0]);

    // Fetch unassigned deliveries count
    const { count: unassignedCount } = await supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .is("driver_id", null)
      .eq("status", "pending");

    // Build 7-day sparkline data
    const weeklyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      weeklyMap[d.toISOString().split("T")[0]] = 0;
    }
    for (const o of weeklyOrders ?? []) {
      const day = o.created_at.split("T")[0];
      if (day in weeklyMap) weeklyMap[day] = (weeklyMap[day] ?? 0) + o.total_amount;
    }
    const weeklyRevenue = Object.entries(weeklyMap).map(([date, revenue]) => ({ date, revenue }));

    // Outstanding dues = sum of unpaid credit balances
    const { data: creditDues } = await supabase
      .from("customers")
      .select("credit_balance")
      .gt("credit_balance", 0);
    const outstandingDuesAmount = (creditDues ?? []).reduce((s, c) => s + (c.credit_balance ?? 0), 0);

    const stats = {
      today_orders:         todayOrders.length,
      today_revenue:        todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
      pending_deliveries:   deliveries.filter((d) => d.status === "pending").length,
      delivered_today:      deliveries.filter((d) => d.status === "delivered").length,
      total_customers:      customers.length,
      low_stock_items:      lowStock.length,
      outstanding_dues:     outstandingDuesAmount,
      pending_orders:       todayOrders.filter((o) => o.status === "pending").length,
      unassigned_deliveries: unassignedCount ?? 0,
      weekly_revenue:       weeklyRevenue,
    };

    return <AdminDashboard stats={stats} role={role} fullName={profile?.full_name || ""} />;
  }

  if (role === "staff" || role === "delivery_person") {
    const { data: myDeliveries } = await supabase
      .from("deliveries")
      .select("id, status, order:orders(order_number, delivery_date, address:customer_addresses(address_line1, city))")
      .eq("driver_id", user.id)
      .in("status", ["assigned", "loaded", "en_route"])
      .limit(10);

    return <StaffDashboard deliveries={myDeliveries || []} fullName={profile?.full_name || ""} />;
  }

  // Customer
  const [{ data: myOrders }, { data: deliveryPreference }, { data: addresses }, { data: customerRow }, { data: bottles }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, delivery_date, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("customer_delivery_preferences")
      .select("frequency, days_of_week, days_of_month, is_active")
      .eq("customer_id", user.id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("id, label, address_line1, address_line2, city, is_default")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false }),
    supabase
      .from("customers")
      .select("payment_method_preference, credit_balance")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("customer_bottles")
      .select("quantity_owned, product:products(name, size_label)")
      .eq("customer_id", user.id),
  ]);

  return (
    <CustomerDashboard
      orders={myOrders || []}
      fullName={profile?.full_name || ""}
      deliveryPreference={deliveryPreference ?? null}
      addresses={addresses ?? []}
      paymentPreference={customerRow?.payment_method_preference ?? "cash"}
      creditBalance={customerRow?.credit_balance ?? 0}
      bottles={(bottles ?? []).map((b: any) => ({
        quantity_owned: b.quantity_owned,
        product: Array.isArray(b.product) ? (b.product[0] ?? null) : b.product,
      }))}
    />
  );
}
