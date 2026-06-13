"use client";

import { useState, useMemo } from "react";
import { Search, Package } from "lucide-react";
import type { POSProduct } from "./POSClient";
import type { ProductType } from "@/types";
import { PRODUCT_TYPE_LABEL } from "@/types";
import { clsx } from "clsx";

interface Props {
  products:       POSProduct[];
  cartProductIds: Set<string>;
  onAdd:          (product: POSProduct) => void;
}

const TYPE_FILTERS: { value: ProductType | "all"; label: string }[] = [
  { value: "all",         label: "All"         },
  { value: "bundle",      label: "Bundle"      },
  { value: "refill",      label: "Refill"      },
  { value: "standard",    label: "Standard"    },
  { value: "bottle_only", label: "Bottle Only" },
];

const TYPE_EMOJI: Record<ProductType, string> = {
  standard:    "📦",
  bundle:      "💧",
  refill:      "♻️",
  bottle_only: "🧴",
};

export default function ProductGrid({ products, cartProductIds, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchType   = filter === "all" || p.product_type === filter;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.size_label.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [products, search, filter]);

  return (
    <div className="flex flex-col h-full gap-3">

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

      {/* Type filter chips */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === f.value
                ? "bg-brand-600 border-brand-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Package size={36} className="mb-2 text-slate-300" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
            {filtered.map((product) => {
              const stock     = product.inventory?.quantity_in_stock ?? 0;
              const threshold = product.inventory?.low_stock_threshold ?? 0;
              const outOfStock = stock === 0;
              const lowStock   = !outOfStock && stock <= threshold;
              const inCart     = cartProductIds.has(product.id);

              return (
                <button
                  key={product.id}
                  onClick={() => onAdd(product)}
                  disabled={outOfStock}
                  className={clsx(
                    "relative flex flex-col items-start text-left rounded-xl border p-3 transition-all",
                    "active:scale-95",
                    outOfStock
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                      : inCart
                      ? "border-brand-400 bg-brand-50 shadow-sm ring-1 ring-brand-400"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm"
                  )}
                >
                  {/* Cart indicator */}
                  {inCart && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500" />
                  )}

                  {/* Product icon */}
                  <div className="text-2xl mb-2">{TYPE_EMOJI[product.product_type]}</div>

                  {/* Name */}
                  <p className="font-semibold text-slate-800 text-xs leading-tight mb-0.5 line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400 mb-2">{product.size_label}</p>

                  {/* Price */}
                  <p className="text-brand-700 font-bold text-sm mt-auto">
                    PKR {product.price.toLocaleString()}
                  </p>

                  {/* Stock badge */}
                  {outOfStock ? (
                    <span className="text-xs text-red-500 font-medium mt-1">Out of stock</span>
                  ) : lowStock ? (
                    <span className="text-xs text-amber-600 font-medium mt-1">⚠ {stock} left</span>
                  ) : (
                    <span className="text-xs text-slate-400 mt-1">{stock} in stock</span>
                  )}

                  {/* Bundle pricing hint */}
                  {product.product_type === "bundle" && (
                    <span className="text-xs text-slate-400 mt-0.5">
                      Btl {product.bottle_price} + H₂O {product.water_price}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
