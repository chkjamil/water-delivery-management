"use client";

import { useState, useTransition } from "react";
import { X, UserPlus, Phone, Mail, User, Lock, FileText } from "lucide-react";
import { addCustomer } from "../actions";
import toast from "react-hot-toast";
import { isValidPKPhone, normalizePKPhone } from "@/lib/validators";

interface Props {
  onClose:  () => void;
  onSaved:  () => void;
}

export default function AddCustomerModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    full_name: "",
    email:     "",
    phone:     "",
    password:  "Aqua@1234",   // default password — customer can reset
    notes:     "",
  });
  const [isPending, start] = useTransition();

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function isPhoneValid(raw: string) {
    return !raw || isValidPKPhone(raw);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim())     { toast.error("Email is required"); return; }
    if (form.phone && !isPhoneValid(form.phone)) {
      toast.error("Enter a valid Pakistani mobile number (03XX-XXXXXXX)"); return;
    }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    start(async () => {
      const result = await addCustomer({
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        phone:     form.phone ? normalizePKPhone(form.phone) : "",
        password:  form.password,
        notes:     form.notes,
      });
      if (result.error) { toast.error(result.error); return; }
      toast.success("Customer account created");
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-brand-600" />
            <h3 className="font-bold text-slate-800">Add Customer</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">

            <div className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              Admin-created accounts are pre-verified — no email confirmation needed.
              The customer can reset their password via "Forgot password".
            </div>

            <div>
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="Muhammad Ali"
                  value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" type="email" placeholder="ali@example.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">
                Mobile Number
                <span className="text-slate-400 font-normal ml-1 text-xs">(Pakistan — optional)</span>
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" type="tel" placeholder="0300-1234567"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              {form.phone && !isPhoneValid(form.phone) && (
                <p className="text-xs text-red-500 mt-1">Not a valid Pakistani mobile number</p>
              )}
              {form.phone && isPhoneValid(form.phone) && (
                <p className="text-xs text-green-600 mt-1">✓ Phone will be marked verified automatically</p>
              )}
            </div>

            <div>
              <label className="label">
                Default Password <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1 text-xs">(customer can change)</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9 font-mono" type="text"
                  value={form.password} onChange={(e) => set("password", e.target.value)}
                  minLength={8} required />
              </div>
            </div>

            <div>
              <label className="label">Notes (internal)</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-slate-400" />
                <textarea className="input pl-9 resize-none" rows={2}
                  placeholder="Delivery instructions, area, etc."
                  value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={isPending}>
            {isPending ? "Creating…" : "Create Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
