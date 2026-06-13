"use client";

import { useState, useTransition } from "react";
import {
  User, Phone, Mail, MapPin, Plus, Trash2,
  Check, Loader2, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidPKPhone, normalizePKPhone } from "@/lib/validators";

interface Address {
  id:            string;
  label:         string;
  address_line1: string;
  address_line2: string | null;
  city:          string;
  is_default:    boolean;
}

interface Profile {
  id:             string;
  full_name:      string;
  email:          string;
  phone:          string | null;
  email_verified: boolean;
  phone_verified: boolean;
}

interface Props {
  profile:   Profile;
  addresses: Address[];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileClient({ profile: initial, addresses: initialAddresses }: Props) {
  const [profile, setProfile]       = useState(initial);
  const [addresses, setAddresses]   = useState(initialAddresses);
  const [tab, setTab]               = useState<"info" | "addresses">("info");
  const [saveMsg, setSaveMsg]       = useState("");
  const [saveErr, setSaveErr]       = useState("");
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // ── Profile form state ──────────────────────────────────────────────────────
  const [form, setForm]     = useState({ full_name: profile.full_name });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg]   = useState("");
  const [pwErr, setPwErr]   = useState("");

  // ── Address form ────────────────────────────────────────────────────────────
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "Home", address_line1: "", address_line2: "", city: "Islamabad", is_default: false,
  });
  const [addrMsg, setAddrMsg] = useState("");

  // ── OTP state for phone verification ───────────────────────────────────────
  const [phoneInput, setPhoneInput] = useState(profile.phone ?? "");
  const [otpSent, setOtpSent]       = useState(false);
  const [otpCode, setOtpCode]       = useState("");
  const [phoneMsg, setPhoneMsg]     = useState("");
  const [phoneErr, setPhoneErr]     = useState("");
  const [phonePending, startPhoneTx] = useTransition();

  // ── Save profile info ───────────────────────────────────────────────────────
  function saveProfile() {
    if (!form.full_name.trim()) { setSaveErr("Name cannot be empty."); return; }
    startTransition(async () => {
      setSaveErr(""); setSaveMsg("");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim() })
        .eq("id", profile.id);

      if (error) { setSaveErr(error.message); }
      else {
        setSaveMsg("Profile updated.");
        setProfile((p) => ({ ...p, full_name: form.full_name.trim() }));
        setTimeout(() => setSaveMsg(""), 3000);
      }
    });
  }

  // ── Change password ─────────────────────────────────────────────────────────
  function changePassword() {
    if (pwForm.next.length < 8)           { setPwErr("Password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm)   { setPwErr("Passwords do not match."); return; }
    startTransition(async () => {
      setPwErr(""); setPwMsg("");
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) { setPwErr(error.message); }
      else {
        setPwMsg("Password changed.");
        setPwForm({ current: "", next: "", confirm: "" });
        setTimeout(() => setPwMsg(""), 3000);
      }
    });
  }

  // ── Phone OTP flow ──────────────────────────────────────────────────────────
  function sendOTP() {
    if (!isValidPKPhone(phoneInput)) {
      setPhoneErr("Enter a valid Pakistan mobile number (e.g. 0312 3456789).");
      return;
    }
    startPhoneTx(async () => {
      setPhoneErr("");
      const normalized = normalizePKPhone(phoneInput);
      const { error } = await supabase.auth.updateUser({ phone: normalized });
      if (error) { setPhoneErr(error.message); }
      else { setOtpSent(true); setPhoneMsg("OTP sent! Check your SMS."); }
    });
  }

  function verifyOTP() {
    if (otpCode.length < 4) { setPhoneErr("Enter the OTP from your SMS."); return; }
    startPhoneTx(async () => {
      setPhoneErr("");
      const normalized = normalizePKPhone(phoneInput);
      const { error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otpCode,
        type:  "phone_change",
      });
      if (error) { setPhoneErr(error.message); }
      else {
        // Update profiles.phone_verified
        await supabase.from("profiles").update({ phone_verified: true, phone: normalized }).eq("id", profile.id);
        setProfile((p) => ({ ...p, phone: normalized, phone_verified: true }));
        setPhoneMsg("Phone verified successfully! ✓");
        setOtpSent(false);
        setOtpCode("");
      }
    });
  }

  // ── Add address ─────────────────────────────────────────────────────────────
  function addAddress() {
    if (!addrForm.address_line1.trim()) { setAddrMsg("Address is required."); return; }
    startTransition(async () => {
      setAddrMsg("");
      // If setting default, clear previous default
      if (addrForm.is_default) {
        await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", profile.id);
      }
      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({ ...addrForm, customer_id: profile.id })
        .select()
        .single();
      if (error) { setAddrMsg(error.message); }
      else {
        setAddresses((prev) =>
          addrForm.is_default
            ? [...prev.map((a) => ({ ...a, is_default: false })), data]
            : [...prev, data]
        );
        setAddrForm({ label: "Home", address_line1: "", address_line2: "", city: "Islamabad", is_default: false });
        setShowAddAddr(false);
      }
    });
  }

  // ── Delete address ──────────────────────────────────────────────────────────
  async function deleteAddress(id: string) {
    if (!confirm("Remove this address?")) return;
    await supabase.from("customer_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Set default ─────────────────────────────────────────────────────────────
  async function setDefault(id: string) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", profile.id);
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["info", "addresses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "info" ? "My Info" : "Addresses"}
          </button>
        ))}
      </div>

      {/* ── Tab: Info ─────────────────────────────────────────────────────── */}
      {tab === "info" && (
        <div className="space-y-4">
          {/* Profile info */}
          <div className="card p-6 space-y-5">
            <h2 className="font-bold text-slate-800">Personal Info</h2>

            <div className="space-y-3">
              {/* Name */}
              <div className="space-y-1">
                <label className="label flex items-center gap-1.5"><User size={13} /> Full Name</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) => { setForm({ full_name: e.target.value }); setSaveMsg(""); setSaveErr(""); }}
                />
              </div>

              {/* Email (read-only with badge) */}
              <div className="space-y-1">
                <label className="label flex items-center gap-1.5"><Mail size={13} /> Email</label>
                <div className="flex items-center gap-2">
                  <input className="input flex-1 bg-slate-50 cursor-not-allowed" value={profile.email} readOnly />
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    profile.email_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {profile.email_verified ? <><Check size={11} /> Verified</> : <><AlertTriangle size={11} /> Not verified</>}
                  </span>
                </div>
              </div>
            </div>

            {saveErr && <p className="text-sm text-red-600">{saveErr}</p>}
            {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}

            <button onClick={saveProfile} disabled={isPending} className="btn-primary flex items-center gap-2">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Info"}
            </button>
          </div>

          {/* Phone verification */}
          <div className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-800">Phone Number</h2>
                <p className="text-sm text-slate-500 mt-0.5">Verified phone is used for delivery updates.</p>
              </div>
              {profile.phone_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
            </div>

            {!profile.phone_verified ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="label flex items-center gap-1.5"><Phone size={13} /> Mobile Number</label>
                  <input
                    className="input"
                    placeholder="0312 3456789"
                    value={phoneInput}
                    onChange={(e) => { setPhoneInput(e.target.value); setPhoneErr(""); setPhoneMsg(""); }}
                    disabled={otpSent}
                  />
                </div>

                {otpSent && (
                  <div className="space-y-1">
                    <label className="label">Enter OTP from SMS</label>
                    <input
                      className="input tracking-widest text-lg font-bold"
                      placeholder="••••••"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); setPhoneErr(""); }}
                    />
                  </div>
                )}

                {phoneErr && <p className="text-sm text-red-600">{phoneErr}</p>}
                {phoneMsg && <p className="text-sm text-green-600">{phoneMsg}</p>}

                <div className="flex gap-2">
                  {!otpSent ? (
                    <button onClick={sendOTP} disabled={phonePending} className="btn-primary flex items-center gap-2">
                      {phonePending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send OTP"}
                    </button>
                  ) : (
                    <>
                      <button onClick={verifyOTP} disabled={phonePending} className="btn-primary flex items-center gap-2">
                        {phonePending ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : "Verify"}
                      </button>
                      <button onClick={() => { setOtpSent(false); setOtpCode(""); setPhoneMsg(""); }} className="btn-secondary">
                        Change Number
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" />
                {profile.phone}
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Change Password</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Minimum 8 characters"
                  value={pwForm.next}
                  onChange={(e) => { setPwForm((p) => ({ ...p, next: e.target.value })); setPwErr(""); setPwMsg(""); }}
                />
              </div>
              <div className="space-y-1">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.confirm}
                  onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwErr(""); }}
                />
              </div>
            </div>
            {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}
            <button onClick={changePassword} disabled={isPending} className="btn-primary flex items-center gap-2">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Update Password"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Addresses ─────────────────────────────────────────────────── */}
      {tab === "addresses" && (
        <div className="space-y-3">
          {addresses.length === 0 && !showAddAddr && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">📍</div>
              <p className="font-semibold text-slate-600">No saved addresses</p>
              <p className="text-sm text-slate-400 mt-1">Add an address to speed up checkout</p>
            </div>
          )}

          {addresses.map((addr) => (
            <div key={addr.id} className={`card p-4 flex items-start gap-3 ${addr.is_default ? "border-brand-200 ring-1 ring-brand-100" : ""}`}>
              <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-slate-800 text-sm">{addr.label}</p>
                  {addr.is_default && (
                    <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">Default</span>
                  )}
                </div>
                <p className="text-sm text-slate-600">{addr.address_line1}</p>
                {addr.address_line2 && <p className="text-xs text-slate-400">{addr.address_line2}</p>}
                <p className="text-xs text-slate-400">{addr.city}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => deleteAddress(addr.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Add address form */}
          {showAddAddr ? (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-slate-800 text-sm">New Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Label</label>
                  <input className="input" placeholder="Home / Office / Other"
                    value={addrForm.label} onChange={(e) => setAddrForm((p) => ({ ...p, label: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="label">City</label>
                  <input className="input"
                    value={addrForm.city} onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="label">Street Address</label>
                  <input className="input" placeholder="House #, Street, Sector"
                    value={addrForm.address_line1} onChange={(e) => setAddrForm((p) => ({ ...p, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="label">Address Line 2 (optional)</label>
                  <input className="input" placeholder="Block, Landmark"
                    value={addrForm.address_line2} onChange={(e) => setAddrForm((p) => ({ ...p, address_line2: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                  checked={addrForm.is_default} onChange={(e) => setAddrForm((p) => ({ ...p, is_default: e.target.checked }))} />
                <span className="text-sm text-slate-700">Set as default address</span>
              </label>
              {addrMsg && <p className="text-sm text-red-600">{addrMsg}</p>}
              <div className="flex gap-2">
                <button onClick={addAddress} disabled={isPending} className="btn-primary flex items-center gap-2">
                  {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Address"}
                </button>
                <button onClick={() => { setShowAddAddr(false); setAddrMsg(""); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddAddr(true)} className="btn-secondary flex items-center gap-2 w-full justify-center">
              <Plus size={15} /> Add New Address
            </button>
          )}
        </div>
      )}
    </div>
  );
}
