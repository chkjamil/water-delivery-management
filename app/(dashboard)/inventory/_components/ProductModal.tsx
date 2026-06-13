"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Package } from "lucide-react";
import { upsertProduct, type ProductFormData } from "../actions";
import toast from "react-hot-toast";
import type { InventoryProduct } from "./InventoryClient";
import type { ProductType } from "@/types";
import { PRODUCT_TYPE_LABEL } from "@/types";

interface Props {
  product?: InventoryProduct;
  onClose:  () => void;
  onSaved:  (p: InventoryProduct) => void;
}

const DEFAULTS: ProductFormData = {
  name: "", sku: "", description: "",
  product_type: "standard",
  price: 0, bottle_price: 0, water_price: 0,
  unit: "bottle", size_label: "",
  low_stock_threshold: 30,
  is_active: true,
};

export default function ProductModal({ product, onClose, onSaved }: Props) {
  const [form, setForm]      = useState<ProductFormData>(
    product
      ? {
          id:                  product.id,
          name:                product.name,
          sku:                 product.sku,
          description:         product.description ?? "",
          product_type:        product.product_type,
          price:               product.price,
          bottle_price:        product.bottle_price,
          water_price:         product.water_price,
          unit:                product.unit,
          size_label:          product.size_label,
          low_stock_threshold: product.inventory?.low_stock_threshold ?? 30,
          is_active:           product.is_active,
        }
      : DEFAULTS
  );
  const [isPending, start]   = useTransition();

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Auto-calculate price for bundle/refill/bottle_only
  useEffect(() => {
    if (form.product_type === "bundle")      set("price", form.bottle_price + form.water_price);
    if (form.product_type === "refill")      set("price", form.water_price);
    if (form.product_type === "bottle_only") set("price", form.bottle_price);
  }, [form.product_type, form.bottle_price, form.water_price]);

  // Auto-generate SKU from name (only for new products)
  function handleNameChange(name: string) {
    set("name", name);
    if (!product) {
      const sku = name.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20);
      set("sku", sku);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.sku.trim())  { toast.error("SKU is required"); return; }
    if (!form.size_label.trim()) { toast.error("Size label is required"); return; }

    start(async () => {
      const result = await upsertProduct(form);
      if (result.error) { toast.error(result.error); return; }
      toast.success(product ? "Product updated!" : "Product added!");
      // result.product lacks the inventory join — create a shell so parent can update
      onSaved({
        ...result.product,
        inventory: product?.inventory ?? null,
      } as InventoryProduct);
    });
  }

  const isBundle  = form.product_type === "bundle";
  const isRefill  = form.product_type === "refill";
  const isBottle  = form.product_type === "bottle_only";
  const isSplit   = isBundle || isRefill || isBottle;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-brand-600" />
            <h3 className="font-bold text-slate-800">{product ? "Edit Product" : "Add New Product"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">

            {/* Product Type */}
            <div>
              <label className="label">Product Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["standard", "bundle", "refill", "bottle_only"] as ProductType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set("product_type", type)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                      form.product_type === type
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-base mb-0.5">
                      {type === "standard" ? "📦" : type === "bundle" ? "🆕" : type === "refill" ? "♻️" : "🧴"}
                    </div>
                    <div className="text-xs leading-tight">{PRODUCT_TYPE_LABEL[type]}</div>
                  </button>
                ))}
              </div>
              {isBundle && <p className="text-xs text-green-700 mt-1.5 bg-green-50 px-3 py-1.5 rounded-lg">Customer pays bottle + water price. Adds to bottle ledger.</p>}
              {isRefill && <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 px-3 py-1.5 rounded-lg">Customer brings own bottle. Pays water price only.</p>}
              {isBottle && <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">Empty bottle only. Adds to customer bottle ledger.</p>}
            </div>

            {/* Name & SKU */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Product Name <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. 19L Bottle + Water" required />
              </div>
              <div>
                <label className="label">SKU <span className="text-red-500">*</span></label>
                <input className="input font-mono" value={form.sku}
                  onChange={(e) => set("sku", e.target.value.toUpperCase())}
                  placeholder="WTR-19GAL" required
                  disabled={!!product} // Don't allow SKU changes if orders exist
                />
                {product && <p className="text-xs text-slate-400 mt-1">SKU cannot be changed after creation</p>}
              </div>
              <div>
                <label className="label">Size Label <span className="text-red-500">*</span></label>
                <input className="input" value={form.size_label}
                  onChange={(e) => set("size_label", e.target.value)}
                  placeholder="19 Gallon" required />
              </div>
            </div>

            {/* Pricing */}
            {isSplit ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(isBundle || isBottle) && (
                    <div>
                      <label className="label">Bottle Price (PKR)</label>
                      <input className="input" type="number" min="0" step="1"
                        value={form.bottle_price}
                        onChange={(e) => set("bottle_price", parseFloat(e.target.value) || 0)} />
                    </div>
                  )}
                  {(isBundle || isRefill) && (
                    <div>
                      <label className="label">Water/Fill Price (PKR)</label>
                      <input className="input" type="number" min="0" step="1"
                        value={form.water_price}
                        onChange={(e) => set("water_price", parseFloat(e.target.value) || 0)} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                  <span className="text-sm text-slate-600">Total selling price</span>
                  <span className="text-lg font-bold text-brand-700">PKR {form.price}</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Selling Price (PKR) <span className="text-red-500">*</span></label>
                <input className="input" type="number" min="0" step="0.01"
                  value={form.price}
                  onChange={(e) => set("price", parseFloat(e.target.value) || 0)} required />
              </div>
            )}

            {/* Unit & Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                  <option value="bottle">Bottle</option>
                  <option value="refill">Refill</option>
                  <option value="crate">Crate</option>
                  <option value="pack">Pack</option>
                  <option value="litre">Litre</option>
                </select>
              </div>
              <div>
                <label className="label">Low Stock Threshold</label>
                <input className="input" type="number" min="0"
                  value={form.low_stock_threshold}
                  onChange={(e) => set("low_stock_threshold", parseInt(e.target.value) || 0)} />
                <p className="text-xs text-slate-400 mt-1">Alert when stock falls below this</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input resize-none" rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Any notes about this product…" />
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("is_active", !form.is_active)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? "bg-brand-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {form.is_active ? "Active — visible in POS & orders" : "Inactive — hidden from POS & orders"}
              </span>
            </label>

          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={isPending}>
            {isPending ? "Saving…" : product ? "Save Changes" : "Add Product"}
          </button>
        </div>

      </div>
    </div>
  );
}
