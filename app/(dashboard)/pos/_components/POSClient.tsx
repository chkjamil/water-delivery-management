"use client";

import { useState, useTransition, useCallback } from "react";
import ProductGrid from "./ProductGrid";
import Cart from "./Cart";
import CustomerSearch from "./CustomerSearch";
import PaymentModal from "./PaymentModal";
import POSReceipt, { type ReceiptData } from "./POSReceipt";
import { createPOSOrder, type POSOrderItem, type CreatePOSOrderInput } from "../actions";
import toast from "react-hot-toast";
import type { ProductType } from "@/types";

export type POSProduct = {
  id:            string;
  name:          string;
  sku:           string;
  price:         number;
  unit:          string;
  size_label:    string;
  product_type:  ProductType;
  bottle_price:  number;
  water_price:   number;
  image_url:     string | null;
  is_active:     boolean;
  inventory:     { quantity_in_stock: number; low_stock_threshold: number } | null;
};

export type CartItem = {
  product:    POSProduct;
  quantity:   number;
  unit_price: number;
};

export type POSCustomer = {
  id:        string;
  full_name: string;
  phone:     string | null;
  email:     string | null;
  balance:   number;
};

interface Props {
  initialProducts: POSProduct[];
}

export default function POSClient({ initialProducts }: Props) {
  const [products]                   = useState<POSProduct[]>(initialProducts);
  const [cart, setCart]              = useState<CartItem[]>([]);
  const [customer, setCustomer]      = useState<POSCustomer | null>(null);
  const [discount, setDiscount]      = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder]    = useState<{ id: string; order_number: string } | null>(null);
  const [receipt, setReceipt]        = useState<ReceiptData | null>(null);
  const [isPending, start]           = useTransition();

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = useCallback((product: POSProduct) => {
    const stock = product.inventory?.quantity_in_stock ?? 0;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stock && stock > 0) {
          toast.error(`Only ${stock} in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (stock === 0) {
        toast.error("Out of stock");
        return prev;
      }
      return [...prev, { product, quantity: 1, unit_price: product.price }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomer(null);
    setDiscount(0);
    setLastOrder(null);
    setReceipt(null);
  }, []);

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total    = Math.max(0, subtotal - discount);

  // ── Checkout ─────────────────────────────────────────────────────────────

  function handlePlaceOrder(paymentInput: {
    payment_method: "cash" | "credit" | "online";
    amount_paid:    number;
    note?:          string;
  }) {
    const items: POSOrderItem[] = cart.map((i) => ({
      product_id:   i.product.id,
      product_name: i.product.name,
      quantity:     i.quantity,
      unit_price:   i.unit_price,
    }));

    const input: CreatePOSOrderInput = {
      customer_id:   customer?.id,
      items,
      subtotal,
      discount,
      total,
      ...paymentInput,
    };

    start(async () => {
      const result = await createPOSOrder(input);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Order placed!");

      setLastOrder(result.order ?? null);
      setReceipt({
        order_number:   result.order?.order_number ?? "",
        created_at:     new Date().toISOString(),
        customer,
        items:          cart,
        subtotal,
        discount,
        total,
        payment_method: paymentInput.payment_method,
        amount_paid:    paymentInput.amount_paid,
      });
      setShowPayment(false);
      setCart([]);
      setDiscount(0);

      // Ask before printing so a distracted cashier doesn't skip it, then
      // jump straight to the next sale once the print dialog is dismissed.
      if (confirm("Order placed! Print receipt now?")) {
        setTimeout(() => {
          window.print();
          clearCart();
        }, 50);
      }
    });
  }

  return (
    <>
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-120px)] min-h-[600px] print:hidden">

      {/* ── Left: Product grid ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <ProductGrid
          products={products}
          cartProductIds={new Set(cart.map((i) => i.product.id))}
          onAdd={addToCart}
        />
      </div>

      {/* ── Right: Cart ── */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col">
        <Cart
          cart={cart}
          customer={customer}
          subtotal={subtotal}
          discount={discount}
          total={total}
          isPending={isPending}
          lastOrder={lastOrder}
          onUpdateQty={updateQty}
          onRemove={removeItem}
          onDiscountChange={setDiscount}
          onCustomerChange={setCustomer}
          onCheckout={() => setShowPayment(true)}
          onClear={clearCart}
        />
      </div>

      {/* ── Payment modal ── */}
      {showPayment && (
        <PaymentModal
          cart={cart}
          customer={customer}
          subtotal={subtotal}
          discount={discount}
          total={total}
          isPending={isPending}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePlaceOrder}
        />
      )}
    </div>

    <POSReceipt receipt={receipt} />
    </>
  );
}
