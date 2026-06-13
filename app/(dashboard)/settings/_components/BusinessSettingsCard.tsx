"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { updateSettings } from "../actions";

interface Props {
  settings: Record<string, string>;
}

export default function BusinessSettingsCard({ settings }: Props) {
  const [values, setValues] = useState({
    business_name: settings["business_name"] ?? "AquaFlow Water Co.",
    tagline:       settings["tagline"]       ?? "Pure water, delivered fast",
    city:          settings["city"]          ?? "Islamabad",
    delivery_fee:  settings["delivery_fee"]  ?? "0",
    footer_note:   settings["footer_note"]   ?? "Thank you for your business!",
  });
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateSettings(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold text-slate-800 text-base">Business Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          General info shown on invoices, emails, and the customer app.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="label">Business Name</label>
          <input
            className="input"
            value={values.business_name}
            onChange={(e) => handleChange("business_name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="label">City</label>
          <input
            className="input"
            value={values.city}
            onChange={(e) => handleChange("city", e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="label">Tagline</label>
          <input
            className="input"
            value={values.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="label">Delivery Fee (PKR)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="10"
            value={values.delivery_fee}
            onChange={(e) => handleChange("delivery_fee", e.target.value)}
          />
          <p className="text-xs text-slate-400">Set to 0 for free delivery.</p>
        </div>
        <div className="space-y-1">
          <label className="label">Invoice Footer Note</label>
          <input
            className="input"
            value={values.footer_note}
            onChange={(e) => handleChange("footer_note", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary flex items-center gap-2"
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={15} /> Saved</>
          ) : (
            "Save Changes"
          )}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">✓ Settings updated</p>}
      </div>
    </div>
  );
}
