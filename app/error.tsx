"use client"; // error.tsx MUST be a Client Component in Next.js App Router

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches runtime errors inside the root layout's children (500-class errors)
export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    // Log to your error tracking service here (e.g. Sentry)
    console.error("[AquaFlow Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">

        {/* Illustration */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-5xl select-none">⚠️</span>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-red-500 text-white font-black text-xl w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
            500
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-slate-300 text-base mb-3 leading-relaxed">
          An unexpected error occurred. Our team has been notified.
        </p>

        {/* Error detail (show only in dev) */}
        {process.env.NODE_ENV === "development" && error?.message && (
          <div className="mb-6 text-left bg-black/30 rounded-xl p-4 border border-white/10">
            <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Error</p>
            <p className="text-sm text-red-300 font-mono break-all">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-slate-500 mt-2">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-md"
          >
            🔄 Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
          >
            🏠 Go to Dashboard
          </Link>
        </div>

        <p className="text-slate-500 text-sm mt-8">
          AquaFlow &nbsp;·&nbsp; If this keeps happening, contact your administrator.
        </p>
      </div>
    </div>
  );
}
