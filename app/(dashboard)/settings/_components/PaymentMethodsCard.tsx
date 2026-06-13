"use client";

import { useState, useTransition } from "react";
import { CreditCard, Banknote, Smartphone, Loader2, Check } from "lucide-react";
import { updateSettings } from "../actions";

const METHODS = [
  {
    key:   "payment_cash_enabled",
    label: "Cash on Delivery",
    desc:  "Customer pays in cash when the order is delivered.",
    icon:  <Banknote size={20} className="text-green-600" />,
    bg:    "bg-green-50",
  },
  {
    key:   "payment_online_enabled",
    label: "Online Transfer",
    desc:  "EasyPaisa, JazzCash, or bank transfer before delivery.",
    icon:  <Smartphone size={20} className="text-blue-600" />,
    bg:    "bg-blue-50",
  },
  {
    key:   "payment_credit_enabled",
    label: "Credit Account",
    desc:  "For trusted customers with an outstanding balance.",
    icon:  <CreditCard size={20} className="text-purple-600" />,
    bg:    "bg-purple-50",
  },
];

interface Props {
  settings: Record<string, string>;
}

export default function PaymentMethodsCard({ settings }: Props) {
  const [values, setValues] = useState<Record<string, boolean>>(() => ({
    payment_cash_enabled:   settings["payment_cash_enabled"]   !== "false",
    payment_online_enabled: settings["payment_online_enabled"] !== "false",
    payment_credit_enabled: settings["payment_credit_enabled"] !== "false",
  }));
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(key: string) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const payload: Record<string, string> = {};
      Object.entries(values).forEach(([k, v]) => { payload[k] = v ? "true" : "false"; });
      await updateSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold text-slate-800 text-base">Payment Methods</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Toggle which payment options customers can choose at checkout.
        </p>
      </div>

      <div className="space-y-3">
        {METHODS.map((m) => (
          <div
            key={m.key}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              values[m.key]
                ? "border-brand-200 bg-brand-50/30"
                : "border-slate-200 bg-slate-50 opacity-60"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.bg}`}>
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => toggle(m.key)}
              aria-checked={values[m.key]}
              role="switch"
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                values[m.key] ? "bg-brand-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  values[m.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
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
        {saved && <p className="text-sm text-green-600 font-medium">✓ Payment methods updated</p>}
      </div>
    </div>
  );
}
