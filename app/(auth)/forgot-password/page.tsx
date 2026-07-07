"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card p-6 shadow-xl text-center">
        <div className="text-4xl mb-3">📬</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Check your email</h2>
        <p className="text-sm text-slate-500 mb-6">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        <Link href="/login" className="btn-secondary w-full btn-lg text-center">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="card p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Reset password</h2>
      <p className="text-sm text-slate-500 mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input className="input" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full btn-lg" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-4">
        <Link href="/login" className="text-brand-600 hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
