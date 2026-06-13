"use client";

import { useTransition } from "react";
import { Pencil, PackagePlus, SlidersHorizontal, RotateCcw, Archive, RefreshCw } from "lucide-react";
import { archiveProduct, restoreProduct } from "../actions";
import toast from "react-hot-toast";
import type { InventoryProduct } from "./InventoryClient";
import { PRODUCT_TYPE_LABEL, PRODUCT_TYPE_COLOR } from "@/types";
import { clsx } from "clsx";
import { format } from "date-fns";

interface Props {
  products:   InventoryProduct[];
  canWrite:   boolean;
  onEdit:     (p: InventoryProduct) => void;
  onStockIn:  (p: InventoryProduct) => void;
  onAdjust:   (p: InventoryProduct) => void;
  onReturn:   (p: InventoryProduct) => void;
  onArchive:  (p: InventoryProduct) => void;
  onRestore:  (p: InventoryProduct) => void;
}

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0)          return <span className="badge bg-red-100 text-red-700">Out of stock</span>;
  if (qty <= threshold)   return <span className="badge bg-amber-100 text-amber-700">⚠ Low: {qty}</span>;
  return <span className="badge bg-green-100 text-green-700">{qty} in stock</span>;
}

export default function ProductTable({ products, canWrite, onEdit, onStockIn, onAdjust, onReturn, onArchive, onRestore }: Props) {
  const [isPending, start] = useTransition();

  function handleArchive(product: InventoryProduct) {
    if (!confirm(`Archive "${product.name}"? It will be hidden from POS and orders.`)) return;
    start(async () => {
      const result = await archiveProduct(product.id);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Product archived");
      onArchive({ ...product, is_active: false });
    });
  }

  function handleRestore(product: InventoryProduct) {
    start(async () => {
      const result = await restoreProduct(product.id);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Product restored");
      onRestore({ ...product, is_active: true });
    });
  }

  if (products.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400">
        <PackagePlus size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No products yet</p>
        <p className="text-sm mt-1">Click "Add Product" to get started.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Returns</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Restocked</th>
                {canWrite && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const inv = product.inventory;
                return (
                  <tr key={product.id} className={clsx("hover:bg-slate-50 transition-colors", !product.is_active && "opacity-50 bg-slate-50")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">💧</div>
                        <div>
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.sku} · {product.size_label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge text-xs ${PRODUCT_TYPE_COLOR[product.product_type]}`}>
                        {PRODUCT_TYPE_LABEL[product.product_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">PKR {product.price}</p>
                      {product.product_type === "bundle" && (
                        <p className="text-xs text-slate-400">
                          Btl: {product.bottle_price} + Water: {product.water_price}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {inv
                        ? <StockBadge qty={inv.quantity_in_stock} threshold={inv.low_stock_threshold} />
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {inv?.empty_bottles_returned ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {inv?.last_restocked_at
                        ? format(new Date(inv.last_restocked_at), "MMM d, yyyy")
                        : "Never"}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          {product.is_active ? (
                            <>
                              <button onClick={() => onStockIn(product)} title="Stock In"
                                className="btn-ghost btn-sm p-1.5 text-green-600 hover:bg-green-50">
                                <PackagePlus size={15} />
                              </button>
                              <button onClick={() => onAdjust(product)} title="Adjust Stock"
                                className="btn-ghost btn-sm p-1.5 text-blue-600 hover:bg-blue-50">
                                <SlidersHorizontal size={15} />
                              </button>
                              {(product.product_type === "bundle" || product.product_type === "bottle_only") && (
                                <button onClick={() => onReturn(product)} title="Record Bottle Return"
                                  className="btn-ghost btn-sm p-1.5 text-purple-600 hover:bg-purple-50">
                                  <RotateCcw size={15} />
                                </button>
                              )}
                              <button onClick={() => onEdit(product)} title="Edit Product"
                                className="btn-ghost btn-sm p-1.5">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => handleArchive(product)} title="Archive"
                                className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" disabled={isPending}>
                                <Archive size={15} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => handleRestore(product)} title="Restore"
                              className="btn-ghost btn-sm p-1.5 text-slate-500 hover:bg-slate-100" disabled={isPending}>
                              <RefreshCw size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {products.map((product) => {
          const inv = product.inventory;
          return (
            <div key={product.id} className={clsx("card p-4", !product.is_active && "opacity-50")}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl">💧</div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.sku} · {product.size_label}</p>
                  </div>
                </div>
                <span className={`badge text-xs ${PRODUCT_TYPE_COLOR[product.product_type]}`}>
                  {PRODUCT_TYPE_LABEL[product.product_type]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="font-semibold">PKR {product.price}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Stock</p>
                  {inv ? <StockBadge qty={inv.quantity_in_stock} threshold={inv.low_stock_threshold} /> : <span>—</span>}
                </div>
              </div>
              {canWrite && product.is_active && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => onStockIn(product)} className="btn-secondary btn-sm flex-1">+ Stock In</button>
                  <button onClick={() => onAdjust(product)}  className="btn-secondary btn-sm flex-1">Adjust</button>
                  {(product.product_type === "bundle" || product.product_type === "bottle_only") && (
                    <button onClick={() => onReturn(product)} className="btn-secondary btn-sm flex-1">Return</button>
                  )}
                  <button onClick={() => onEdit(product)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
