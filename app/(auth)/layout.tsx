export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">💧</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AquaFlow</h1>
          <p className="text-brand-200 text-sm mt-1">Water Delivery Management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
