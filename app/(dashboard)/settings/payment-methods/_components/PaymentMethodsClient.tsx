"use client";

import { useState, useTransition } from "react";
import { CreditCard, Banknote, Smartphone, Loader2, Check, DollarSign } from "lucide-react";
import { savePaymentSettings } from "../actions";

const PAYMENT_OPTIONS = [
  {
    key:   "payment_cash_enabled",
    label: "Cash on Delivery",
    desc:  "Customer pays cash when the order arrives at their door.",
    icon:  Banknote,
    iconColor: "text-green-600",
    iconBg:    "bg-green-50",
  },
  {
    key:   "payment_online_enabled",
    label: "Online Transfer",
    desc:  "EasyPaisa, JazzCash, or bank transfer before or on delivery.",
    icon:  Smartphone,
    iconColor: "text-blue-600",
    iconBg:    "bg-blue-50",
  },
  {
    key:   "payment_credit_enabled",
    label: "Credit Account",
    desc:  "For trusted customers — amount added to their outstanding balance.",
    icon:  CreditCard,
    iconColor: "text-purple-600",
    iconBg:    "bg-purple-50",
  },
];

interface Props {
  initialSettings: Record<string, string>;
}

export default function PaymentMethodsClient({ initialSettings }: Props) {
  const [methods, setMethods] = useState<Record<string, boolean>>({
    payment_cash_enabled:   initialSettings["payment_cash_enabled"]   !== "false",
    payment_online_enabled: initialSettings["payment_online_enabled"] !== "false",
    payment_credit_enabled: initialSettings["payment_credit_enabled"] !== "false",
  });
  const [deliveryFee, setDeliveryFee] = useState(initialSettings["delivery_fee"] ?? "0");
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");
  const [isPending, startTransition]  = useTransition();

  function toggle(key: string) {
    setMethods((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
    setError("");
  }

  function handleSave() {
    const enabled = Object.values(methods).filter(Boolean).length;
    if (enabled === 0) {
      setError("At least one payment method must be enabled.");
      return;
    }
    setError("");

    startTransition(async () => {
      const payload: Record<string, string> = { delivery_fee: deliveryFee };
      Object.entries(methods).forEach(([k, v]) => { payload[k] = v ? "true" : "false"; });

      const result = await savePaymentSettings(payload);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Payment method toggles */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Accepted Payment Methods</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Enabled methods appear in the customer checkout and POS terminal.
            At least one method must be active.
          </p>
        </div>

        <div className="space-y-3">
          {PAYMENT_OPTIONS.map(({ key, label, desc, icon: Icon, iconColor, iconBg }) => (
            <div
              key={key}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                methods[key]
                  ? "border-brand-200 bg-white shadow-sm"
                  : "border-slate-200 bg-slate-50/60"
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon size={20} className={iconColor} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${methods[key] ? "text-slate-800" : "text-slate-400"}`}>
                  {label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
              </div>

              {/* Status chip */}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 hidden sm:inline-flex ${
                methods[key] ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
              }`}>
                {methods[key] ? "Active" : "Disabled"}
              </span>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-checked={methods[key]}
                role="switch"
                aria-label={`Toggle ${label}`}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  methods[key] ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    methods[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery fee */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Delivery Fee</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Charged to customers on each delivery. Set to 0 for free delivery.
          </p>
        </div>
        <div className="flex items-center gap-3 max-w-xs">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <DollarSign size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">PKR</span>
            </div>
            <input
              type="number"
              min="0"
              step="10"
              value={deliveryFee}
              onChange={(e) => { setDeliveryFee(e.target.value); setSaved(false); }}
              className="input pl-14"
              placeholder="0"
            />
          </div>
          <span className="text-sm text-slate-400">per order</span>
        </div>
      </div>

      {/* Save */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary flex items-center gap-2"
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={15} /> Saved!</>
          ) : (
            "Save Changes"
          )}
        </button>
        {saved && (
          <p className="text-sm text-green-600 font-medium animate-fade-in">
            ✓ Payment settings updated
          </p>
        )}
      </div>
    </div>
  );
}
