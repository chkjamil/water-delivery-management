"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return { error: "Permission denied", supabase: null };

  return { error: null, supabase };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { error, supabase } = await requireSuperAdmin();
  if (error || !supabase) return { error };

  // Update profiles table
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (updateError) return { error: updateError.message };

  // Also sync user_metadata.role in the JWT so middleware reads the new role immediately
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  revalidatePath("/settings/users");
  return { error: null };
}

export async function toggleUserActive(userId: string, is_active: boolean) {
  const { error, supabase } = await requireSuperAdmin();
  if (error || !supabase) return { error };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ is_active })
    .eq("id", userId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/settings/users");
  return { error: null };
}

// ─── Create a new user with confirmed email ───────────────────────────────────

export async function createUser(input: {
  email:     string;
  password:  string;
  full_name: string;
  phone?:    string;
  role:      UserRole;
}) {
  const { error } = await requireSuperAdmin();
  if (error) return { error };

  const admin = createAdminClient();

  // Create auth user with email confirmed
  // Include role in user_metadata so middleware can read it from the JWT
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:           input.email,
    password:        input.password,
    email_confirm:   true,
    phone:           input.phone || undefined,
    phone_confirm:   input.phone ? true : undefined,
    user_metadata:   { full_name: input.full_name, role: input.role },
  });

  if (authErr) return { error: authErr.message };

  // Upsert the profile (trigger may have already created it)
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({
      id:        authData.user.id,
      email:     input.email,
      full_name: input.full_name,
      phone:     input.phone || null,
      role:      input.role,
      is_active: true,
    }, { onConflict: "id" });

  if (profileErr) return { error: profileErr.message };

  // Create customers row when role is customer
  if (input.role === "customer") {
    await admin
      .from("customers")
      .upsert({ id: authData.user.id, credit_balance: 0, total_spent: 0, loyalty_points: 0, notes: null }, { onConflict: "id", ignoreDuplicates: true });
  }

  revalidatePath("/settings/users");
  return { error: null, userId: authData.user.id };
}
