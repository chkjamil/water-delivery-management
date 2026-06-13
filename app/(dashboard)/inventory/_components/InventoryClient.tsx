"use client";

import { useState } from "react";
import { Plus, Package, AlertTriangle, TrendingDown, RotateCcw } from "lucide-react";
import ProductTable from "./ProductTable";
import ProductModal from "./ProductModal";
import StockInModal from "./StockInModal";
import AdjustStockModal from "./AdjustStockModal";
import BottleReturnModal from "./BottleReturnModal";
import TransactionLog from "./TransactionLog";
import type { Product } from "@/types";

export type InventoryProduct = Product & {
  inventory: {
    id: string;
    quantity_in_stock: number;
    low_stock_threshold: number;
    empty_bottles_returned: number;
    last_restocked_at: string | null;
    updated_at: string;
  } | null;
};

export type LowStockItem = {
  id: string; name: string; sku: string;
  size_label: string; quantity_in_stock: number; low_stock_threshold: number;
};

export type TransactionRow = {
  id: string;
  transaction_type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product: { id: string; name: string; sku: string; size_label: string } | null;
  performed_by_profile: { full_name: string; email: string } | null;
};

interface Props {
  products:      InventoryProduct[];
  lowStockItems: LowStockItem[];
  transactions:  TransactionRow[];
  canWrite:      boolean;
}

export type ModalState =
  | { type: "none" }
  | { type: "add_product" }
  | { type: "edit_product"; product: InventoryProduct }
  | { type: "stock_in"; product: InventoryProduct }
  | { type: "adjust"; product: InventoryProduct }
  | { type: "return"; product: InventoryProduct }
  | { type: "transactions" };

export default function InventoryClient({ products: initial, lowStockItems: initialLow, transactions: initialTx, canWrite }: Props) {
  const [products, setProducts]     = useState<InventoryProduct[]>(initial);
  const [lowStock, setLowStock]     = useState<LowStockItem[]>(initialLow);
  const [transactions, setTx]       = useState<TransactionRow[]>(initialTx);
  const [modal, setModal]           = useState<ModalState>({ type: "none" });
  const [showInactive, setShowInactive] = useState(false);
  const [activeTab, setActiveTab]   = useState<"products" | "log">("products");

  function closeModal() { setModal({ type: "none" }); }

  // Called by child modals after a successful mutation to update local state
  function refreshProduct(updated: InventoryProduct) {
    setProducts((prev) =>
      prev.some((p) => p.id === updated.id)
        ? prev.map((p) => p.id === updated.id ? updated : p)
        : [...prev, updated]
    );
    // Refresh low stock list
    setLowStock((prev) => {
      const inv = updated.inventory;
      const isLow = inv && inv.quantity_in_stock <= inv.low_stock_threshold;
      const without = prev.filter((l) => l.id !== updated.id);
      if (isLow && inv) {
        return [...without, {
          id: updated.id, name: updated.name, sku: updated.sku,
          size_label: updated.size_label,
          quantity_in_stock: inv.quantity_in_stock,
          low_stock_threshold: inv.low_stock_threshold,
        }];
      }
      return without;
    });
  }

  function addTransaction(tx: TransactionRow) {
    setTx((prev) => [tx, ...prev]);
  }

  const visibleProducts = showInactive
    ? products
    : products.filter((p) => p.is_active);

  const totalProducts  = products.filter((p) => p.is_active).length;
  const totalStockValue = products.reduce((sum, p) => {
    const qty = p.inventory?.quantity_in_stock ?? 0;
    return sum + qty * p.price;
  }, 0);

  return (
    <div className="space-y-5">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50"><Package size={18} className="text-brand-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Active Products</p>
              <p className="text-2xl font-bold text-slate-800">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50"><AlertTriangle size={18} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-slate-500">Low Stock</p>
              <p className={`text-2xl font-bold ${lowStock.length > 0 ? "text-red-600" : "text-slate-800"}`}>
                {lowStock.length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50"><TrendingDown size={18} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Stock Value</p>
              <p className="text-2xl font-bold text-slate-800">
                PKR {totalStockValue >= 1000 ? `${(totalStockValue / 1000).toFixed(1)}k` : totalStockValue.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50"><RotateCcw size={18} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Transactions</p>
              <p className="text-2xl font-bold text-slate-800">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Low stock alert panel ── */}
      {lowStock.length > 0 && (
        <div className="card border-red-200">
          <div className="card-header bg-red-50 border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="font-semibold text-red-700 text-sm">
                {lowStock.length} product{lowStock.length > 1 ? "s" : ""} below minimum stock
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="divide-y divide-red-50">
              {lowStock.map((item) => {
                const product = products.find((p) => p.id === item.id);
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{item.sku}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{item.quantity_in_stock} left</p>
                        <p className="text-xs text-slate-400">min: {item.low_stock_threshold}</p>
                      </div>
                      {canWrite && product && (
                        <button
                          onClick={() => setModal({ type: "stock_in", product })}
                          className="btn-primary btn-sm"
                        >
                          + Stock In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs + Actions ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["products", "log"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab === "products" ? `📦 Products (${visibleProducts.length})` : `📋 Transaction Log`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded" />
            Show archived
          </label>
          {canWrite && (
            <button onClick={() => setModal({ type: "add_product" })} className="btn-primary btn-sm">
              <Plus size={14} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "products" ? (
        <ProductTable
          products={visibleProducts}
          canWrite={canWrite}
          onEdit={(p)    => setModal({ type: "edit_product", product: p })}
          onStockIn={(p) => setModal({ type: "stock_in",    product: p })}
          onAdjust={(p)  => setModal({ type: "adjust",      product: p })}
          onReturn={(p)  => setModal({ type: "return",      product: p })}
          onArchive={refreshProduct}
          onRestore={refreshProduct}
        />
      ) : (
        <TransactionLog transactions={transactions} />
      )}

      {/* ── Modals ── */}
      {modal.type === "add_product" && (
        <ProductModal
          onClose={closeModal}
          onSaved={(p) => { refreshProduct(p); closeModal(); }}
        />
      )}
      {modal.type === "edit_product" && (
        <ProductModal
          product={modal.product}
          onClose={closeModal}
          onSaved={(p) => { refreshProduct(p); closeModal(); }}
        />
      )}
      {modal.type === "stock_in" && (
        <StockInModal
          product={modal.product}
          onClose={closeModal}
          onSaved={(p, tx) => { refreshProduct(p); addTransaction(tx); closeModal(); }}
        />
      )}
      {modal.type === "adjust" && (
        <AdjustStockModal
          product={modal.product}
          onClose={closeModal}
          onSaved={(p, tx) => { refreshProduct(p); addTransaction(tx); closeModal(); }}
        />
      )}
      {modal.type === "return" && (
        <BottleReturnModal
          product={modal.product}
          onClose={closeModal}
          onSaved={(p, tx) => { refreshProduct(p); addTransaction(tx); closeModal(); }}
        />
      )}
    </div>
  );
}
