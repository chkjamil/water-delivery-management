import { Suspense } from "react";
import { Droplets } from "lucide-react";
import RegisterForm from "./_components/RegisterForm";

export const metadata = { title: "Create Account — AquaFlow" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <Droplets size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 mt-1 text-sm">Join AquaFlow — pure water, delivered.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={<div className="space-y-4 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-slate-100 rounded-lg" />)}</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
