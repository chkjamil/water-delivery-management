import { formatPKR, formatDateTime } from "@/lib/format";
import type { CartItem, POSCustomer } from "./POSClient";

export type ReceiptData = {
  order_number:   string;
  created_at:     string;
  customer:       POSCustomer | null;
  items:          CartItem[];
  subtotal:       number;
  discount:       number;
  total:          number;
  payment_method: "cash" | "credit" | "online";
  amount_paid:    number;
};

interface Props {
  receipt: ReceiptData | null;
}

// Print-only: invisible on screen, shown only inside the browser print dialog.
// Kept outside the normal POS layout so it never competes with cart/grid markup.
export default function POSReceipt({ receipt }: Props) {
  if (!receipt) return null;

  const change = Math.max(0, receipt.amount_paid - receipt.total);

  return (
    <div className="hidden print:block max-w-sm mx-auto text-sm text-black">
      <div className="text-center mb-3">
        <p className="text-lg font-bold">AquaFlow</p>
        <p className="text-xs">Water Delivery Management</p>
      </div>

      <div className="border-t border-b border-black py-1.5 mb-2 text-xs">
        <div className="flex justify-between"><span>Order #</span><span>{receipt.order_number}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{formatDateTime(receipt.created_at)}</span></div>
        <div className="flex justify-between">
          <span>Customer</span><span>{receipt.customer?.full_name ?? "Walk-in"}</span>
        </div>
      </div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1">Qty</th>
            <th className="text-right py-1">Price</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item) => (
            <tr key={item.product.id}>
              <td className="py-0.5">{item.product.name}</td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5">{item.unit_price.toLocaleString()}</td>
              <td className="text-right py-0.5">{(item.unit_price * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-1.5 text-xs space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(receipt.subtotal)}</span></div>
        {receipt.discount > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>-{formatPKR(receipt.discount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
          <span>Total</span><span>{formatPKR(receipt.total)}</span>
        </div>
        <div className="flex justify-between capitalize pt-1"><span>Payment</span><span>{receipt.payment_method}</span></div>
        {receipt.payment_method !== "credit" && (
          <>
            <div className="flex justify-between"><span>Paid</span><span>{formatPKR(receipt.amount_paid)}</span></div>
            {change > 0 && (
              <div className="flex justify-between"><span>Change</span><span>{formatPKR(change)}</span></div>
            )}
          </>
        )}
        {receipt.payment_method === "credit" && (
          <div className="flex justify-between"><span>Balance due</span><span>{formatPKR(receipt.total)}</span></div>
        )}
      </div>

      <p className="text-center text-xs mt-4">Thank you for your purchase!</p>
    </div>
  );
}
