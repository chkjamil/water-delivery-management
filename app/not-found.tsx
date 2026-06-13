import Link from "next/link";

// Next.js App Router 404 — rendered for any unmatched route
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-6">
      <div className="text-center max-w-md">

        {/* Illustration */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-5xl select-none">💧</span>
            </div>
          </div>
          {/* 404 badge */}
          <div className="absolute -top-2 -right-2 bg-white text-brand-700 font-black text-xl w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
            404
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-brand-200 text-base mb-8 leading-relaxed">
          Looks like this page dried up. The URL you visited doesn&apos;t exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-xl hover:bg-brand-50 transition-colors shadow-md"
          >
            🏠 Go to Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
          >
            ← Go Back
          </Link>
        </div>

        <p className="text-brand-300 text-sm mt-8">
          AquaFlow &nbsp;·&nbsp; Water Delivery Management
        </p>
      </div>
    </div>
  );
}
