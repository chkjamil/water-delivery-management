"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message || "Invalid email or password");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");

    // Determine home page from role in user_metadata (set at account creation).
    // Falls back to /dashboard which shows a role-appropriate view.
    const role = (data.user?.user_metadata?.role as string) ?? "";
    const home  = role === "customer" ? "/order" : "/dashboard";

    // If there's an explicit redirect param use it, otherwise go to role home
    const dest = redirectTo !== "/dashboard" ? redirectTo : home;
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="card p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Sign in</h2>
      <p className="text-sm text-slate-500 mb-6">Enter your credentials to continue</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input pr-16"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full btn-lg" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in…
            </span>
          ) : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        New customer?{" "}
        <Link href="/register" className="text-brand-600 font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
