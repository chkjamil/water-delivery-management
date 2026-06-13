"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null };
  }
  return { error: null, supabase };
}

// ─── Read all settings ────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => { map[r.key] = r.value; });
  return map;
}

// ─── Update a single setting ──────────────────────────────────────────────────

export async function updateSetting(key: string, value: string) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const { error: err } = await supabase
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" });

  if (err) return { error: err.message };
  revalidatePath("/settings");
  revalidatePath("/order"); // refresh delivery fee / payment methods for customers
  return { error: null };
}

// ─── Update multiple settings at once ────────────────────────────────────────

export async function updateSettings(settings: Record<string, string>) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
  const { error: err } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });

  if (err) return { error: err.message };
  revalidatePath("/settings");
  revalidatePath("/order");
  revalidatePath("/dashboard");
  return { error: null };
}
