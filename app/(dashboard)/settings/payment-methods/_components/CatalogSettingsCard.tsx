"use client";

import { useState, useTransition } from "react";
import { Package, Loader2, Check } from "lucide-react";
import { updateSettings } from "../../actions";

interface Props {
  settings: Record<string, string>;
}

export default function CatalogSettingsCard({ settings }: Props) {
  const [showOos,   setShowOos]   = useState(settings["show_oos_products"] !== "false");
  const [allowBook, setAllowBook] = useState(settings["allow_oos_booking"] === "true");
  const [saved,     setSaved]     = useState(false);
  const [isPending, start]        = useTransition();

  function handleSave() {
    start(async () => {
      await updateSettings({
        show_oos_products: showOos   ? "true" : "false",
        allow_oos_booking: allowBook ? "true" : "false",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Package size={17} className="text-brand-600" /> Catalog &amp; Inventory
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Control how out-of-stock products appear in the customer ordering portal.
        </p>
      </div>

      <div className="space-y-4">
        {/* Toggle: show OOS products */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
          <div className="flex-1">
            <p className="font-semibold text-slate-800 text-sm">Show out-of-stock products</p>
            <p className="text-xs text-slate-500 mt-0.5">
              When enabled, customers can see products that have zero stock (shown grayed-out).
              When disabled, out-of-stock products are hidden from the catalog entirely.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowOos((v) => !v); setSaved(false); }}
            aria-checked={showOos}
            role="switch"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mt-0.5 ${
              showOos ? "bg-brand-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                showOos ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle: allow booking when OOS */}
        {showOos && (
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 ml-4">
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">Allow booking out-of-stock products</p>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, customers can add out-of-stock items to their cart and place orders
                (useful for pre-orders or if you know stock is arriving soon).
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setAllowBook((v) => !v); setSaved(false); }}
              aria-checked={allowBook}
              role="switch"
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mt-0.5 ${
                allowBook ? "bg-brand-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  allowBook ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}
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
        {saved && <p className="text-sm text-green-600 font-medium">✓ Catalog settings updated</p>}
      </div>
    </div>
  );
}
