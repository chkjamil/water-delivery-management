"use client";

import { useState, useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import ProductCatalog from "./ProductCatalog";
import CheckoutDrawer from "./CheckoutDrawer";
import type { POSProduct } from "@/app/(dashboard)/pos/_components/POSClient";

export type CartItem = {
  product:    POSProduct;
  quantity:   number;
};

export type CustomerAddress = {
  id:            string;
  label:         string;
  address_line1: string;
  address_line2?: string;
  city:          string;
  is_default:    boolean;
  zone_id?:      string;
};

export type TimeSlot = {
  id:         string;
  label:      string;
  start_time: string;
  end_time:   string;
  max_orders: number;
};

interface Props {
  products:         POSProduct[];
  addresses:        CustomerAddress[];
  timeSlots:        TimeSlot[];
  enabledPayments:  string[];
  deliveryFee:      number;
  customerId:       string;
  allowOosBooking:  boolean;
}

export default function CustomerOrderClient({
  products, addresses, timeSlots, enabledPayments, deliveryFee, customerId, allowOosBooking,
}: Props) {
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);

  const addToCart = useCallback((product: POSProduct) => {
    const stock = product.inventory?.quantity_in_stock ?? 0;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (stock > 0 && existing.quantity >= stock) return prev;
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (stock === 0 && !allowOosBooking) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }, [allowOosBooking]);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const totalItems    = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal      = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <div className="pb-24"> {/* Bottom padding for floating button */}

      <ProductCatalog
        products={products}
        cart={cart}
        onAdd={addToCart}
        onUpdateQty={updateQty}
        allowOosBooking={allowOosBooking}
      />

      {/* Floating cart button */}
      {totalItems > 0 && !showCheckout && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center">
          <button
            onClick={() => setShowCheckout(true)}
            className="btn-primary shadow-xl px-6 py-4 text-base font-bold rounded-2xl flex items-center gap-3 w-full max-w-sm"
          >
            <div className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-brand-700 text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span className="flex-1 text-left">View Cart</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Checkout drawer */}
      {showCheckout && (
        <CheckoutDrawer
          cart={cart}
          addresses={addresses}
          timeSlots={timeSlots}
          enabledPayments={enabledPayments}
          deliveryFee={deliveryFee}
          customerId={customerId}
          onUpdateQty={updateQty}
          onClose={() => setShowCheckout(false)}
          onOrderPlaced={clearCart}
        />
      )}
    </div>
  );
}
