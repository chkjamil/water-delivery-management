"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePaymentSettings(values: Record<string, string>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return { error: "Permission denied" };
  }

  const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
  const { error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return { error: error.message };

  revalidatePath("/settings/payment-methods");
  revalidatePath("/order"); // customers see updated options immediately
  return { error: null };
}
