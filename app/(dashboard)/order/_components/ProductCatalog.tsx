"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Minus, CheckCircle } from "lucide-react";
import type { POSProduct } from "@/app/(dashboard)/pos/_components/POSClient";
import type { CartItem } from "./CustomerOrderClient";
import { clsx } from "clsx";

const TYPE_EMOJI: Record<string, string> = {
  standard:    "📦",
  bundle:      "💧",
  refill:      "♻️",
  bottle_only: "🧴",
};

interface Props {
  products:        POSProduct[];
  cart:            CartItem[];
  onAdd:           (p: POSProduct) => void;
  onUpdateQty:     (productId: string, qty: number) => void;
  allowOosBooking?: boolean;
}

export default function ProductCatalog({ products, cart, onAdd, onUpdateQty, allowOosBooking = false }: Props) {
  const [search, setSearch] = useState("");

  const cartMap = useMemo(
    () => Object.fromEntries(cart.map((i) => [i.product.id, i.quantity])),
    [cart]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) =>
      !q || p.name.toLowerCase().includes(q) || p.size_label.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Group by product_type for organized display
  const grouped = useMemo(() => {
    const groups: Record<string, POSProduct[]> = {};
    filtered.forEach((p) => {
      const g = p.product_type;
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    return groups;
  }, [filtered]);

  const GROUP_LABELS: Record<string, string> = {
    bundle:      "💧 Water + Bottle (New)",
    refill:      "♻️ Refills (Own Bottle)",
    standard:    "📦 Standard Products",
    bottle_only: "🧴 Bottles Only",
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">💧</p>
          <p className="font-medium">No products found</p>
        </div>
      )}

      {/* Product groups */}
      {(["bundle", "refill", "standard", "bottle_only"] as const).map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        return (
          <div key={type}>
            <h2 className="text-sm font-bold text-slate-600 mb-3">{GROUP_LABELS[type]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((product) => {
                const stock      = product.inventory?.quantity_in_stock ?? 0;
                const inCart     = cartMap[product.id] ?? 0;
                const outOfStock = stock === 0;

                return (
                  <div
                    key={product.id}
                    className={clsx(
                      "card p-4 transition-all",
                      outOfStock && "opacity-60",
                      inCart > 0 && "border-brand-300 ring-1 ring-brand-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {TYPE_EMOJI[product.product_type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{product.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{product.size_label}</p>
                        <p className="text-brand-700 font-bold text-base mt-1">
                          PKR {product.price.toLocaleString()}
                        </p>
                        {product.product_type === "bundle" && (
                          <p className="text-xs text-slate-400">
                            Btl {product.bottle_price} + H₂O {product.water_price}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock info */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={clsx(
                        "text-xs font-medium",
                        outOfStock ? "text-red-500" : stock <= 5 ? "text-amber-600" : "text-slate-400"
                      )}>
                        {outOfStock ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : `${stock} available`}
                      </span>

                      {/* Add / Qty controls */}
                      {outOfStock && !allowOosBooking ? (
                        <span className="text-xs text-slate-300">Unavailable</span>
                      ) : inCart === 0 ? (
                        <button
                          onClick={() => onAdd(product)}
                          className="btn-primary btn-sm flex items-center gap-1.5 px-3 py-1.5"
                        >
                          <Plus size={13} /> Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQty(product.id, inCart - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center font-bold text-slate-800 text-sm">{inCart}</span>
                          <button
                            onClick={() => onUpdateQty(product.id, inCart + 1)}
                            disabled={stock > 0 && inCart >= stock}
                            className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white hover:bg-brand-700 transition-colors disabled:opacity-40"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
