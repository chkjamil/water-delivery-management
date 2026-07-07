"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Notification } from "@/types";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };
  return { error: null, supabase, user };
}

export async function getNotifications(limit = 20) {
  const { error, supabase, user } = await requireUser();
  if (error || !supabase || !user) return { error, notifications: [] as Notification[], unreadCount: 0 };

  const [listRes, countRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, message, related_order_id, related_delivery_id, related_product_id, is_read, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false),
  ]);

  if (listRes.error) return { error: listRes.error.message, notifications: [] as Notification[], unreadCount: 0 };
  if (countRes.error) return { error: countRes.error.message, notifications: [] as Notification[], unreadCount: 0 };

  return {
    error: null,
    notifications: (listRes.data ?? []) as Notification[],
    unreadCount: countRes.count ?? 0,
  };
}

export async function markNotificationRead(id: string) {
  const { error, supabase, user } = await requireUser();
  if (error || !supabase || !user) return { error };

  const { error: err } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", user.id);

  if (err) return { error: err.message };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function markAllNotificationsRead() {
  const { error, supabase, user } = await requireUser();
  if (error || !supabase || !user) return { error };

  const { error: err } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (err) return { error: err.message };

  revalidatePath("/", "layout");
  return { error: null };
}
