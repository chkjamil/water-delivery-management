"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Eye, EyeOff, Phone, Mail, User, Lock } from "lucide-react";
import { isValidPKPhone, normalizePKPhone } from "@/lib/validators";

export default function RegisterForm() {
  const router   = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name:        "",
    email:            "",
    phone:            "",
    password:         "",
    confirm_password: "",
  });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false); // show "check email" screen

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validatePhone(raw: string) {
    return isValidPKPhone(raw);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim())                     { toast.error("Name is required"); return; }
    if (!validatePhone(form.phone))                 { toast.error("Enter a valid Pakistani mobile number (03XX-XXXXXXX)"); return; }
    if (form.password.length < 8)                   { toast.error("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm_password)    { toast.error("Passwords don't match"); return; }

    setLoading(true);
    const phone  = normalizePKPhone(form.phone.replace(/[\s\-()]/g, ""));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          phone,
          role: "customer",
        },
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Mail size={28} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Check your email</h2>
          <p className="text-sm text-slate-500 mt-2">
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          After confirming your email, you can{" "}
          <Link href="/login" className="text-brand-600 hover:underline font-medium">sign in</Link>{" "}
          and verify your phone number.
        </p>
        <p className="text-xs text-slate-400">
          Didn't receive it? Check spam or{" "}
          <button
            onClick={() => setDone(false)}
            className="text-brand-600 hover:underline"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Customer-only notice */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-700">
        <span className="text-base leading-none mt-0.5">ℹ️</span>
        <span>
          This registration is for <strong>customers only</strong>. Staff and admin accounts are created by the system administrator.
        </span>
      </div>

      {/* Full name */}
      <div>
        <label className="label">Full Name <span className="text-red-500">*</span></label>
        <div className="relative">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Muhammad Ali"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            required
            autoComplete="name"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="label">Email <span className="text-red-500">*</span></label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
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
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            autoComplete="tel"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Format: 03XX-XXXXXXX or +923XX-XXXXXXX
        </p>
        {form.phone && !validatePhone(form.phone.replace(/[\s\-()]/g, "")) && (
          <p className="text-xs text-red-500 mt-1">Not a valid Pakistani mobile number</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="label">Password <span className="text-red-500">*</span></label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 pr-10"
            type={showPw ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label className="label">Confirm Password <span className="text-red-500">*</span></label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            type={showPw ? "text" : "password"}
            placeholder="Repeat password"
            value={form.confirm_password}
            onChange={(e) => set("confirm_password", e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        {form.confirm_password && form.password !== form.confirm_password && (
          <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
      </p>
    </form>
  );
}
