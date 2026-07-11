"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";

async function requireAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

// Admin client uses service role key — bypasses RLS for admin operations
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── List customers ───────────────────────────────────────────────────────────

export async function getCustomers() {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error, customers: [] };

  const [{ data, error: err }, { data: spentRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, full_name, email, phone, is_active, email_verified, phone_verified, created_at,
        customers(credit_balance, loyalty_points, notes)
      `)
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    // customers.total_spent is never actually maintained anywhere in this
    // codebase (always stuck at its 0 default) — compute it from delivered
    // orders instead.
    supabase.from("customer_total_spent_view").select("customer_id, total_spent"),
  ]);

  if (err) return { error: err.message, customers: [] };

  const spentMap = new Map((spentRows ?? []).map((r) => [r.customer_id, r.total_spent]));

  const customers = (data ?? []).map((p) => {
    const c = Array.isArray(p.customers) ? p.customers[0] : p.customers;
    return {
      id:             p.id,
      full_name:      p.full_name,
      email:          p.email,
      phone:          p.phone,
      is_active:      p.is_active,
      email_verified: (p as any).email_verified ?? false,
      phone_verified: p.phone_verified,
      created_at:     p.created_at,
      credit_balance: c?.credit_balance ?? 0,
      total_spent:    spentMap.get(p.id) ?? 0,
      loyalty_points: c?.loyalty_points ?? 0,
      notes:          c?.notes          ?? "",
    };
  });

  return { error: null, customers };
}

// ─── Add customer (admin creates account, no email verification required) ─────

export async function addCustomer(data: {
  full_name:  string;
  email:      string;
  phone:      string;
  password:   string;
  notes?:     string;
}) {
  const { error } = await requireAdminAccess();
  if (error) return { error };

  const adminSupabase = getAdminSupabase();

  // Create auth user — skip email confirmation (admin-created accounts are pre-verified)
  const { data: created, error: authErr } = await adminSupabase.auth.admin.createUser({
    email:              data.email,
    password:           data.password,
    email_confirm:      true,   // auto-confirm email
    phone:              data.phone || undefined,
    phone_confirm:      !!data.phone, // auto-confirm phone if provided
    user_metadata: {
      full_name: data.full_name,
      phone:     data.phone,
      role:      "customer",
    },
  });

  if (authErr) return { error: authErr.message };

  // Update profile with phone_verified if phone was given
  if (data.phone) {
    await adminSupabase
      .from("profiles")
      .update({ phone: data.phone, phone_verified: true })
      .eq("id", created.user.id);
  }

  // Save notes
  if (data.notes?.trim()) {
    await adminSupabase
      .from("customers")
      .update({ notes: data.notes.trim() })
      .eq("id", created.user.id);
  }

  // Send welcome email with temp credentials (non-blocking)
  await sendWelcomeEmail({
    to:           data.email,
    customerName: data.full_name,
    tempPassword: data.password,
  });

  revalidatePath("/customers");
  return { error: null };
}

// ─── Toggle customer active status ───────────────────────────────────────────

export async function toggleCustomerActive(id: string, is_active: boolean) {
  const { error } = await requireAdminAccess();
  if (error) return { error };

  const adminSupabase = getAdminSupabase();

  // Disable/enable in Supabase Auth
  await adminSupabase.auth.admin.updateUserById(id, { ban_duration: is_active ? "none" : "876000h" });

  // Update profile
  const { error: err } = await adminSupabase
    .from("profiles")
    .update({ is_active })
    .eq("id", id);

  if (err) return { error: err.message };
  revalidatePath("/customers");
  return { error: null };
}

// ─── Mark phone as manually verified (admin override) ────────────────────────

export async function markPhoneVerified(id: string) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", id);

  if (err) return { error: err.message };
  revalidatePath("/customers");
  return { error: null };
}

// ─── Update customer notes ────────────────────────────────────────────────────

export async function updateCustomerNotes(id: string, notes: string) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("customers").update({ notes }).eq("id", id);

  if (err) return { error: err.message };
  revalidatePath(`/customers/${id}`);
  return { error: null };
}

// ─── Admin-side address management ────────────────────────────────────────────
// Same "unset previous default, then write" logic as saveAddress() in
// order/actions.ts, but callable by an admin on behalf of any customer
// instead of being scoped to the logged-in customer's own session.

export async function addCustomerAddress(customerId: string, input: {
  label:         string;
  address_line1: string;
  address_line2?: string;
  city:          string;
  zone_id?:      string;
  is_default:    boolean;
}) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  if (input.is_default) {
    await supabase.from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);
  }

  const { data, error: err } = await supabase
    .from("customer_addresses")
    .insert({ ...input, customer_id: customerId })
    .select()
    .single();

  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null, address: data };
}

export async function updateCustomerAddress(customerId: string, addressId: string, input: {
  label:         string;
  address_line1: string;
  address_line2?: string;
  city:          string;
  zone_id?:      string;
  is_default:    boolean;
}) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  if (input.is_default) {
    await supabase.from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);
  }

  const { error: err } = await supabase
    .from("customer_addresses")
    .update(input)
    .eq("id", addressId)
    .eq("customer_id", customerId);

  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

export async function deleteCustomerAddress(customerId: string, addressId: string) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  const { count } = await supabase
    .from("customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  if ((count ?? 0) <= 1) {
    return { error: "A customer must have at least one address — add another before deleting this one." };
  }

  const { data: address } = await supabase
    .from("customer_addresses").select("is_default").eq("id", addressId).single();
  const { data: activePref } = await supabase
    .from("customer_delivery_preferences")
    .select("address_id")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .maybeSingle();
  if (activePref && (activePref.address_id === addressId || (!activePref.address_id && address?.is_default))) {
    return { error: "This address is used for an active delivery schedule — update the schedule before deleting it." };
  }

  const { error: err } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customerId);

  // The DB trigger (027_protect_customer_addresses.sql) is the authoritative
  // backstop — surface its message if a race or edge case slips past the
  // prechecks above.
  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

// ─── Payment preference (cash vs. running monthly account) ───────────────────

export async function updatePaymentPreference(customerId: string, pref: "cash" | "monthly") {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("customers")
    .update({ payment_method_preference: pref })
    .eq("id", customerId);

  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

// ─── Delivery-day scheduling preference ───────────────────────────────────────

export interface DeliveryPreferenceInput {
  frequency:            "weekly" | "biweekly" | "monthly";
  days_of_week:         number[];
  days_of_month:        number[];
  biweekly_anchor_date: string | null;
  address_id:           string | null;
  time_slot_id:         string | null;
  is_active:            boolean;
}

export async function upsertDeliveryPreference(customerId: string, input: DeliveryPreferenceInput) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  // A zone-less address resolves no driver (lib/delivery-projection.ts), so an
  // active schedule on one would silently never generate a stop. Only enforced
  // when activating — a draft/inactive schedule can still be saved without one.
  if (input.is_active) {
    const { data: address } = input.address_id
      ? await supabase.from("customer_addresses").select("zone_id").eq("id", input.address_id).single()
      : await supabase.from("customer_addresses").select("zone_id").eq("customer_id", customerId).eq("is_default", true).maybeSingle();

    if (!address?.zone_id) {
      return { error: "This address needs a delivery zone before the schedule can be activated. Edit the address and pick a zone first." };
    }
  }

  const { error: err } = await supabase
    .from("customer_delivery_preferences")
    .upsert({ ...input, customer_id: customerId }, { onConflict: "customer_id" });

  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

// ─── Credit balance settlement ─────────────────────────────────────────────────
// credit_balance (customers table) previously had no way to decrease anywhere in
// this codebase — only ever incremented via increment_customer_balance (POS
// 'credit' flow, and now also delivery completion for monthly/unpaid-cash
// accrual). This records a payment against it with an auditable trail.

export async function recordCreditPayment(customerId: string, amount: number, note?: string) {
  const { error, supabase, user } = await requireAdminAccess();
  if (error || !supabase || !user) return { error };

  if (amount <= 0) return { error: "Amount must be greater than 0" };

  const { error: err } = await supabase.rpc("record_credit_payment", {
    p_customer_id: customerId, p_amount: amount, p_note: note ?? null, p_created_by: user.id,
  });

  if (err) return { error: err.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

// ─── Standing items ("usual order") ───────────────────────────────────────────
// Full replace: delete rows no longer present, then upsert the rest. Two
// sequential, non-transactional calls — consistent with this codebase's
// existing tolerance for that (e.g. order/actions.ts's order + order_items
// insert is likewise two sequential calls).

export async function upsertStandingItems(
  customerId: string,
  items: { product_id: string; quantity: number }[]
) {
  const { error, supabase } = await requireAdminAccess();
  if (error || !supabase) return { error };

  await supabase.from("customer_standing_items").delete().eq("customer_id", customerId);

  if (items.length > 0) {
    const { error: err } = await supabase
      .from("customer_standing_items")
      .insert(items.map((i) => ({ ...i, customer_id: customerId })));
    if (err) return { error: err.message };
  }

  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}
