"use client";

import { useState, useTransition } from "react";
import { saveBusinessSettings } from "../actions";
import toast from "react-hot-toast";
import { Building2, Globe, Phone, Mail, MapPin, FileText } from "lucide-react";

interface Props {
  initialValues: Record<string, string>;
}

export default function BusinessSettingsForm({ initialValues }: Props) {
  const [values, setValues] = useState({
    business_name:    initialValues.business_name    ?? "",
    tagline:          initialValues.tagline          ?? "",
    phone:            initialValues.phone            ?? "",
    email:            initialValues.email            ?? "",
    address:          initialValues.address          ?? "",
    city:             initialValues.city             ?? "",
    website:          initialValues.website          ?? "",
    currency:         initialValues.currency         ?? "PKR",
    tax_rate:         initialValues.tax_rate         ?? "0",
    invoice_prefix:   initialValues.invoice_prefix   ?? "INV",
    order_prefix:     initialValues.order_prefix     ?? "ORD",
    footer_note:      initialValues.footer_note      ?? "",
  });

  const [isPending, startTransition] = useTransition();

  function update(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveBusinessSettings(values);
      if (result.error) toast.error(result.error);
      else toast.success("Business settings saved!");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Business Identity */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Business Identity</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Business Name <span className="text-red-500">*</span></label>
              <input className="input" value={values.business_name} onChange={update("business_name")} placeholder="AquaFlow Water Co." required />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={values.tagline} onChange={update("tagline")} placeholder="Pure water, delivered fast" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Prefix</label>
              <input className="input" value={values.invoice_prefix} onChange={update("invoice_prefix")} placeholder="INV" maxLength={6} />
              <p className="text-xs text-slate-400 mt-1">e.g. INV-00001</p>
            </div>
            <div>
              <label className="label">Order Prefix</label>
              <input className="input" value={values.order_prefix} onChange={update("order_prefix")} placeholder="ORD" maxLength={6} />
              <p className="text-xs text-slate-400 mt-1">e.g. ORD-00001</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Contact Information</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label"><Phone size={13} className="inline mr-1" />Phone</label>
              <input className="input" type="tel" value={values.phone} onChange={update("phone")} placeholder="03xx-xxxxxxx" />
            </div>
            <div>
              <label className="label"><Mail size={13} className="inline mr-1" />Email</label>
              <input className="input" type="email" value={values.email} onChange={update("email")} placeholder="info@aquaflow.pk" />
            </div>
          </div>
          <div>
            <label className="label"><Globe size={13} className="inline mr-1" />Website</label>
            <input className="input" type="url" value={values.website} onChange={update("website")} placeholder="https://aquaflow.pk" />
          </div>
          <div>
            <label className="label"><MapPin size={13} className="inline mr-1" />Address</label>
            <input className="input" value={values.address} onChange={update("address")} placeholder="Street address" />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={values.city} onChange={update("city")} placeholder="Islamabad" />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Financial Settings</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Currency</label>
              <select className="input" value={values.currency} onChange={update("currency")}>
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>
            <div>
              <label className="label">Tax Rate (%)</label>
              <input className="input" type="number" min="0" max="100" step="0.01"
                value={values.tax_rate} onChange={update("tax_rate")} placeholder="0" />
              <p className="text-xs text-slate-400 mt-1">Enter 0 for no tax</p>
            </div>
          </div>
          <div>
            <label className="label">Receipt / Invoice Footer Note</label>
            <textarea className="input resize-none" rows={2}
              value={values.footer_note} onChange={update("footer_note")}
              placeholder="Thank you for your business! For support: 03xx-xxxxxxx" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
          Discard
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
