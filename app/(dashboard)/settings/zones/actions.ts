"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DeliveryZone } from "@/types";

export async function upsertZone(data: Partial<DeliveryZone> & { name: string; delivery_fee: number }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["super_admin", "admin"].includes(profile.role))
    return { error: "Permission denied" };

  const payload = {
    name:         data.name,
    delivery_fee: data.delivery_fee,
    is_active:    data.is_active ?? true,
  };

  let result;
  if (data.id) {
    result = await supabase
      .from("delivery_zones")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("delivery_zones")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) return { error: result.error.message };

  revalidatePath("/settings/zones");
  return { zone: result.data as DeliveryZone };
}

export async function deleteZone(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["super_admin", "admin"].includes(profile.role))
    return { error: "Permission denied" };

  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings/zones");
  return { success: true };
}
