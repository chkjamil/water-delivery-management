import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimeSlotsClient from "./_components/TimeSlotsClient";

export default async function TimeSlotsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: slots, error } = await supabase
    .from("time_slots")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  return <TimeSlotsClient initialSlots={slots ?? []} />;
}
