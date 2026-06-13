"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TimeSlot } from "@/types";

export async function upsertSlot(data: Partial<TimeSlot> & { label: string; start_time: string; end_time: string; max_orders: number }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["super_admin", "admin"].includes(profile.role))
    return { error: "Permission denied" };

  const payload = {
    label:      data.label,
    start_time: data.start_time,
    end_time:   data.end_time,
    max_orders: data.max_orders,
    is_active:  data.is_active ?? true,
  };

  const result = data.id
    ? await supabase.from("time_slots").update(payload).eq("id", data.id).select().single()
    : await supabase.from("time_slots").insert(payload).select().single();

  if (result.error) return { error: result.error.message };

  revalidatePath("/settings/time-slots");
  return { slot: result.data as TimeSlot };
}

export async function deleteSlot(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["super_admin", "admin"].includes(profile.role))
    return { error: "Permission denied" };

  const { error } = await supabase.from("time_slots").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings/time-slots");
  return { success: true };
}
