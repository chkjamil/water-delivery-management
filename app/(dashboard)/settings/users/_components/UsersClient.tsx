"use client";

import { useState, useTransition } from "react";
import { Users, Search, Shield, UserCheck, UserX, UserPlus, X, Eye, EyeOff } from "lucide-react";
import { updateUserRole, toggleUserActive, createUser } from "../actions";
import toast from "react-hot-toast";
import type { Profile, UserRole } from "@/types";
import { ROLE_META } from "@/lib/permissions";
import { clsx } from "clsx";
import { format } from "date-fns";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "super_admin",     label: "👑 Super Admin"     },
  { value: "admin",           label: "🛠️ Admin"           },
  { value: "staff",           label: "👷 Staff"            },
  { value: "delivery_person", label: "🛵 Delivery Person" },
  { value: "customer",        label: "👤 Customer"        },
];

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:     "bg-amber-100 text-amber-800",
  admin:           "bg-red-100 text-red-800",
  staff:           "bg-blue-100 text-blue-800",
  delivery_person: "bg-purple-100 text-purple-800",
  customer:        "bg-green-100 text-green-800",
};

const DEFAULT_FORM = { email: "", password: "", full_name: "", phone: "", role: "staff" as UserRole };

export default function UsersClient({
  initialUsers, currentUserId,
}: { initialUsers: Profile[]; currentUserId: string }) {
  const [users, setUsers]       = useState<Profile[]>(initialUsers);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<UserRole | "all">("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [isPending, start]      = useTransition();

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filter === "all" || u.role === filter;
    return matchesSearch && matchesRole;
  });

  function handleRoleChange(userId: string, newRole: UserRole) {
    if (userId === currentUserId) { toast.error("You cannot change your own role"); return; }
    start(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) { toast.error(result.error); return; }
      setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x));
      toast.success("Role updated");
    });
  }

  function handleToggleActive(userId: string, current: boolean) {
    if (userId === currentUserId) { toast.error("You cannot deactivate yourself"); return; }
    start(async () => {
      const result = await toggleUserActive(userId, !current);
      if (result.error) { toast.error(result.error); return; }
      setUsers((u) => u.map((x) => x.id === userId ? { ...x, is_active: !current } : x));
      toast.success(current ? "User deactivated" : "User activated");
    });
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) { toast.error("Name, email and password are required"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    start(async () => {
      const result = await createUser({
        email:     form.email,
        password:  form.password,
        full_name: form.full_name,
        phone:     form.phone || undefined,
        role:      form.role,
      });
      if (result.error) { toast.error(result.error); return; }
      toast.success(`User created — ${form.email}`);
      setShowAdd(false);
      setForm(DEFAULT_FORM);
      // Optimistically add to list
      setUsers((u) => [...u, {
        id:         result.userId!,
        email:      form.email,
        full_name:  form.full_name,
        phone:      form.phone || null,
        role:       form.role,
        is_active:  true,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    });
  }

  const counts = {
    all:             users.length,
    super_admin:     users.filter(u => u.role === "super_admin").length,
    admin:           users.filter(u => u.role === "admin").length,
    staff:           users.filter(u => u.role === "staff").length,
    delivery_person: users.filter(u => u.role === "delivery_person").length,
    customer:        users.filter(u => u.role === "customer").length,
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Users & Roles</h3>
            <span className="badge bg-slate-100 text-slate-600 ml-1">{users.length}</span>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <UserPlus size={14} /> Add User
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-8 py-2 text-sm" placeholder="Search by name or email…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "super_admin", "admin", "staff", "delivery_person", "customer"] as const).map((r) => (
              <button key={r} onClick={() => setFilter(r)}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === r ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                {r === "all" ? `All (${counts.all})` : `${ROLE_META[r].icon} ${ROLE_META[r].label} (${counts[r]})`}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No users match your search.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <div key={u.id} className={clsx("flex items-center gap-4 px-5 py-3.5", !u.is_active && "opacity-60")}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                    {(u.full_name || u.email).charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {u.full_name || "—"}
                        {u.id === currentUserId && (
                          <span className="ml-1 text-xs text-slate-400">(you)</span>
                        )}
                      </p>
                      {!u.is_active && <span className="badge bg-red-100 text-red-700 text-xs">Inactive</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {/* Role selector */}
                  <div className="flex-shrink-0">
                    <select
                      value={u.role}
                      disabled={isPending || u.id === currentUserId}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className={clsx("text-xs font-semibold px-2 py-1.5 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer disabled:cursor-not-allowed", ROLE_COLORS[u.role])}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(u.id, u.is_active)}
                    disabled={isPending || u.id === currentUserId}
                    title={u.is_active ? "Deactivate user" : "Activate user"}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {u.is_active
                      ? <UserCheck size={16} className="text-green-600" />
                      : <UserX size={16} className="text-red-500" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Role changes take effect immediately.</strong> Deactivated users are signed out on their next request and cannot log in until reactivated.
        </p>
      </div>

      {/* ── Add User Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-brand-600" /> Add New User
              </h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input className="input" placeholder="John Smith" required
                  value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input className="input" type="email" placeholder="user@example.com" required
                  value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" placeholder="03xx-xxxxxxx"
                  value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input className="input pr-10" type={showPwd ? "text" : "password"} placeholder="Min 8 characters" required
                    value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Email will be confirmed automatically — user can log in immediately.</p>
              </div>
              <div>
                <label className="label">Role <span className="text-red-500">*</span></label>
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
