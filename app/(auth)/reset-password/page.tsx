"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { isValidPassword, passwordsMatch } from "@/lib/validators";

type Status = "checking" | "ready" | "no_session";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus]     = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? "ready" : "no_session");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPassword(password)) { toast.error("Password must be at least 8 characters"); return; }
    if (!passwordsMatch(password, confirm)) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { toast.error(error.message); return; }

    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (status === "checking") {
    return (
      <div className="card p-6 shadow-xl animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
        <div className="h-10 bg-slate-100 rounded" />
        <div className="h-10 bg-slate-100 rounded" />
        <div className="h-11 bg-slate-200 rounded" />
      </div>
    );
  }

  if (status === "no_session") {
    return (
      <div className="card p-6 shadow-xl text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Link expired or invalid</h2>
        <p className="text-sm text-slate-500 mb-6">
          This password reset link is no longer valid. Request a new one below.
        </p>
        <Link href="/forgot-password" className="btn-primary w-full btn-lg text-center">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Set a new password</h2>
      <p className="text-sm text-slate-500 mb-6">Enter and confirm your new password.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            className="input"
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirm && password !== confirm && (
            <p className="text-xs text-red-500 mt-1">Passwords don&apos;t match</p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full btn-lg" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-4">
        <Link href="/login" className="text-brand-600 hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
