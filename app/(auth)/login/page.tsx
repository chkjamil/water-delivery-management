import { Suspense } from "react";
import LoginForm from "./_components/LoginForm";

// Next.js 15 + React 19: components using useSearchParams() must be
// wrapped in <Suspense> at the page level to avoid a build-time error.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="card p-6 shadow-xl animate-pulse space-y-4">
      <div className="h-6 bg-slate-200 rounded w-1/3" />
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="h-10 bg-slate-100 rounded" />
      <div className="h-10 bg-slate-100 rounded" />
      <div className="h-11 bg-slate-200 rounded" />
    </div>
  );
}
