import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Droplets, ShieldCheck } from "lucide-react";
import VerifyPhoneForm from "./_components/VerifyPhoneForm";

export const metadata = { title: "Verify Phone — AquaFlow" };

export default async function VerifyPhonePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", session.user.id)
    .single();

  // Already verified — skip
  if (profile?.phone_verified) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Verify Your Phone</h1>
          <p className="text-slate-500 mt-1 text-sm">One-time verification to secure your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <VerifyPhoneForm existingPhone={profile?.phone ?? ""} />
        </div>
      </div>
    </div>
  );
}
