"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Phone, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { isValidPKPhone, normalizePKPhone } from "@/lib/validators";

type Step = "enter_phone" | "enter_otp";

interface Props {
  existingPhone?: string; // pre-fill if already on profile
}

export default function VerifyPhoneForm({ existingPhone }: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [step,    setStep]    = useState<Step>("enter_phone");
  const [phone,   setPhone]   = useState(existingPhone ?? "");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 — send OTP
  async function sendOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPKPhone(phone)) {
      toast.error("Enter a valid Pakistani mobile number (03XX-XXXXXXX)");
      return;
    }
    setLoading(true);
    const normalized = normalizePKPhone(phone);

    // updateUser sends an OTP to the new phone number
    const { error } = await supabase.auth.updateUser({ phone: normalized });
    setLoading(false);

    if (error) {
      // "Phone provider is not enabled" means Twilio is not yet configured in Supabase
      if (error.message.includes("provider")) {
        toast.error("SMS service not configured. Contact support.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(`OTP sent to ${normalized}`);
    setStep("enter_otp");
  }

  // Step 2 — verify OTP
  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    setLoading(true);

    const normalized = normalizePKPhone(phone);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type:  "phone_change",
    });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Mark phone_verified in profiles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles")
        .update({ phone: normalized, phone_verified: true })
        .eq("id", user.id);
    }

    setLoading(false);
    toast.success("Phone verified!");
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step === "enter_phone" ? "bg-brand-600 text-white" : "bg-green-500 text-white"
        }`}>
          {step === "enter_phone" ? "1" : "✓"}
        </div>
        <div className={`flex-1 h-0.5 ${step === "enter_otp" ? "bg-brand-400" : "bg-slate-200"}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step === "enter_otp" ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400"
        }`}>
          2
        </div>
      </div>

      {step === "enter_phone" ? (
        <form onSubmit={sendOTP} className="space-y-4">
          <div>
            <p className="font-semibold text-slate-800 mb-1">Enter your mobile number</p>
            <p className="text-sm text-slate-500 mb-4">
              We'll send a 6-digit OTP via SMS to verify it belongs to you.
            </p>
            <label className="label">
              Mobile Number <span className="text-red-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(Pakistan only)</span>
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                type="tel"
                placeholder="0300-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
            </div>
            {phone && !isValidPKPhone(phone) && (
              <p className="text-xs text-red-500 mt-1">Not a valid Pakistani mobile number</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isValidPKPhone(phone)}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Sending…" : <>Send OTP <ArrowRight size={15} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOTP} className="space-y-4">
          <div>
            <p className="font-semibold text-slate-800 mb-1">Enter the OTP</p>
            <p className="text-sm text-slate-500 mb-4">
              We sent a 6-digit code to <strong>{normalizePKPhone(phone)}</strong>.
              It expires in 10 minutes.
            </p>
            <label className="label">6-Digit OTP <span className="text-red-500">*</span></label>
            <input
              className="input text-center text-2xl font-bold tracking-[0.5em]"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Verifying…" : <><ShieldCheck size={15} /> Verify Phone</>}
          </button>

          <button
            type="button"
            onClick={() => setStep("enter_phone")}
            className="w-full text-sm text-slate-500 hover:text-brand-600 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} /> Change number or resend OTP
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Skip for now (you can verify later in your profile)
      </button>
    </div>
  );
}
