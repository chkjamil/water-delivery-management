"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendDeliveryUpdate } from "@/lib/email";

// Shared upload pattern (also used by my-stops/actions.ts): goes through the
// service-role client so no Storage RLS policies are needed — authorization
// is already enforced by requireDriver()/assertDriverOwns() below.
async function uploadDeliveryProofPhoto(ownerId: string, photo: File) {
  const admin = createAdminClient();
  const ext = photo.name?.includes(".") ? photo.name.split(".").pop() : "jpg";
  const path = `${ownerId}-${Date.now()}.${ext}`;
  const buffer = await photo.arrayBuffer();
  const { error } = await admin.storage.from("delivery-proofs").upload(path, buffer, {
    contentType: photo.type || "image/jpeg",
  });
  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

async function requireDriver() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const allowed = ["super_admin", "admin", "staff", "delivery_person"];
  if (!allowed.includes(profile?.role ?? "")) {
    return { error: "Permission denied", supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

async function assertDriverOwns(supabase: Awaited<ReturnType<typeof createClient>>, deliveryId: string, userId: string) {
  const { data } = await supabase
    .from("deliveries")
    .select("driver_id")
    .eq("id", deliveryId)
    .single();
  return data?.driver_id === userId;
}

export async function startDelivery(deliveryId: string) {
  const { error, supabase, user } = await requireDriver();
  if (error || !supabase || !user) return { error };

  const owns = await assertDriverOwns(supabase, deliveryId, user.id);
  if (!owns) return { error: "Not your delivery" };

  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({ status: "loaded", updated_at: new Date().toISOString() })
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };
  revalidatePath("/my-deliveries");
  revalidatePath("/deliveries");
  return { error: null };
}

export async function goEnRoute(deliveryId: string) {
  const { error, supabase, user } = await requireDriver();
  if (error || !supabase || !user) return { error };

  const owns = await assertDriverOwns(supabase, deliveryId, user.id);
  if (!owns) return { error: "Not your delivery" };

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({ status: "en_route", dispatched_at: now, updated_at: now })
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };

  await _syncOrderAndEmail(supabase, deliveryId, "en_route", user.id);

  revalidatePath("/my-deliveries");
  revalidatePath("/deliveries");
  return { error: null };
}

export interface DeliveryProofInput {
  photo?: File;
  lat?: number;
  lng?: number;
  accuracy?: number;
  locationAvailable: boolean;
}

export async function markDelivered(deliveryId: string, bottlesCollected: number, proof?: DeliveryProofInput) {
  const { error, supabase, user } = await requireDriver();
  if (error || !supabase || !user) return { error };

  const owns = await assertDriverOwns(supabase, deliveryId, user.id);
  if (!owns) return { error: "Not your delivery" };

  let proofPhotoPath: string | null = null;
  if (proof?.photo) {
    const uploaded = await uploadDeliveryProofPhoto(deliveryId, proof.photo);
    if (uploaded.error) return { error: uploaded.error };
    proofPhotoPath = uploaded.path;
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({
      status: "delivered",
      delivered_at: now,
      empty_bottles_collected: bottlesCollected,
      updated_at: now,
      proof_lat: proof?.lat ?? null,
      proof_lng: proof?.lng ?? null,
      proof_accuracy: proof?.accuracy ?? null,
      proof_captured_at: now,
      proof_photo_path: proofPhotoPath,
      location_available: proof?.locationAvailable ?? false,
    })
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };

  await _syncOrderAndEmail(supabase, deliveryId, "delivered", user.id);

  if (bottlesCollected > 0) {
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("order:orders(order_items(product_id, quantity))")
      .eq("id", deliveryId)
      .single();

    const order = Array.isArray((delivery as any)?.order) ? (delivery as any)?.order[0] : (delivery as any)?.order;
    const items = order?.order_items ?? [];
    if (items.length > 0) {
      await supabase.from("stock_transactions").insert(
        items.map((item: any) => ({
          product_id: item.product_id,
          transaction_type: "return",
          quantity: bottlesCollected,
          note: "Collected on delivery",
          performed_by: user.id,
        }))
      );
    }
  }

  revalidatePath("/my-deliveries");
  revalidatePath("/deliveries");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function markFailed(deliveryId: string, failedReason: string, notes: string) {
  const { error, supabase, user } = await requireDriver();
  if (error || !supabase || !user) return { error };

  const owns = await assertDriverOwns(supabase, deliveryId, user.id);
  if (!owns) return { error: "Not your delivery" };

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({
      status: "failed",
      failed_reason: failedReason,
      notes: notes || null,
      updated_at: now,
    })
    .eq("id", deliveryId);

  if (updateErr) return { error: updateErr.message };

  await _syncOrderAndEmail(supabase, deliveryId, "failed", user.id);

  revalidatePath("/my-deliveries");
  revalidatePath("/deliveries");
  revalidatePath("/orders");
  return { error: null };
}

async function _syncOrderAndEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliveryId: string,
  newStatus: string,
  driverId: string
) {
  const { data: delivery } = await supabase
    .from("deliveries")
    .select(`
      order_id,
      order:orders(
        order_number, delivery_date,
        customer:profiles!orders_customer_id_fkey(email, full_name),
        time_slot:time_slots(label)
      ),
      driver:profiles!deliveries_driver_id_fkey(full_name)
    `)
    .eq("id", deliveryId)
    .single();

  if (!delivery) return;

  if (delivery.order_id) {
    const statusMap: Record<string, string> = {
      en_route: "en_route", delivered: "delivered", failed: "failed",
    };
    if (statusMap[newStatus]) {
      await supabase
        .from("orders")
        .update({ status: statusMap[newStatus], updated_at: new Date().toISOString() })
        .eq("id", delivery.order_id);
    }
  }

  const order = Array.isArray((delivery as any).order) ? (delivery as any).order[0] : (delivery as any).order;
  const customer = order ? (Array.isArray(order.customer) ? order.customer[0] : order.customer) : null;
  const slot = order ? (Array.isArray(order.time_slot) ? order.time_slot[0] : order.time_slot) : null;
  const driver = Array.isArray((delivery as any).driver) ? (delivery as any).driver[0] : (delivery as any).driver;

  if (customer?.email) {
    try {
      await sendDeliveryUpdate({
        to: customer.email,
        customerName: customer.full_name,
        orderNumber: order?.order_number ?? "",
        status: newStatus,
        driverName: driver?.full_name ?? "Our team",
        deliveryDate: order?.delivery_date ?? "",
        timeSlot: slot?.label ?? "",
      });
    } catch {}
  }
}
