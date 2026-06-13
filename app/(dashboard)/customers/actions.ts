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

  const { data, error: err } = await supabase
    .from("profiles")
    .select(`
      id, full_name, email, phone, is_active, email_verified, phone_verified, created_at,
      customers(credit_balance, total_spent, loyalty_points, notes)
    `)
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (err) return { error: err.message, customers: [] };

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
      total_spent:    c?.total_spent    ?? 0,
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
