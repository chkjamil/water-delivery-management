"use client";

import { useState, useTransition } from "react";
import { X, ChevronRight, ChevronLeft, MapPin, Calendar, CreditCard, CheckCircle, Plus, Minus, Banknote, Smartphone, AlertCircle } from "lucide-react";
import { placeCustomerOrder, saveAddress } from "../actions";
import toast from "react-hot-toast";
import type { CartItem, CustomerAddress, TimeSlot } from "./CustomerOrderClient";
import { clsx } from "clsx";

type Step = "cart" | "delivery" | "payment" | "success";

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash:   <Banknote size={18} />,
  online: <Smartphone size={18} />,
  credit: <CreditCard size={18} />,
};
const PAYMENT_LABELS: Record<string, string> = {
  cash:   "Cash on Delivery",
  online: "Online Transfer",
  credit: "Credit Account",
};

interface Props {
  cart:            CartItem[];
  addresses:       CustomerAddress[];
  timeSlots:       TimeSlot[];
  enabledPayments: string[];
  deliveryFee:     number;
  customerId:      string;
  onUpdateQty:     (productId: string, qty: number) => void;
  onClose:         () => void;
  onOrderPlaced:   () => void;
}

const MIN_DAYS_AHEAD = 0; // can order for today

function getAvailableDates(days = 7): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + MIN_DAYS_AHEAD);
    return d.toISOString().split("T")[0];
  });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const weekday = d.toLocaleDateString("en-PK", { weekday: "short" });
  const date    = d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
  if (diff === 0) return `Today · ${date}`;
  if (diff === 1) return `Tomorrow · ${date}`;
  return `${weekday} · ${date}`;
}

export default function CheckoutDrawer({
  cart, addresses, timeSlots, enabledPayments, deliveryFee,
  customerId, onUpdateQty, onClose, onOrderPlaced,
}: Props) {
  const [step,          setStep]          = useState<Step>("cart");
  const [addressId,     setAddressId]     = useState(addresses.find((a) => a.is_default)?.id ?? "");
  const [deliveryDate,  setDeliveryDate]  = useState(getAvailableDates()[0]);
  const [slotId,        setSlotId]        = useState(timeSlots[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | "credit">(
    enabledPayments[0] as any ?? "cash"
  );
  const [note,          setNote]          = useState("");
  const [completedOrder, setCompleted]    = useState<{ order_number: string } | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr]             = useState({ label: "Home", address_line1: "", city: "Islamabad", is_default: false });
  const [isPending, start]                = useTransition();

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total    = subtotal + deliveryFee;

  const dates = getAvailableDates(7);

  function handlePlaceOrder() {
    if (!addressId)   { toast.error("Select a delivery address"); setStep("delivery"); return; }
    if (!slotId)      { toast.error("Select a time slot"); setStep("delivery"); return; }

    start(async () => {
      const result = await placeCustomerOrder({
        items: cart.map((i) => ({
          product_id:   i.product.id,
          product_name: i.product.name,
          quantity:     i.quantity,
          unit_price:   i.product.price,
        })),
        address_id:     addressId,
        delivery_date:  deliveryDate,
        time_slot_id:   slotId,
        payment_method: paymentMethod,
        note,
        subtotal,
        delivery_fee:   deliveryFee,
        discount:       0,
        total,
      });

      if (result.error) { toast.error(result.error); return; }
      setCompleted(result.order ?? null);
      setStep("success");
      onOrderPlaced();
    });
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddr.address_line1.trim()) { toast.error("Address is required"); return; }
    start(async () => {
      const result = await saveAddress(newAddr);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Address saved");
      setAddressId(result.address?.id ?? "");
      setShowAddAddress(false);
    });
  }

  const STEPS: Step[] = ["cart", "delivery", "payment"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={() => step !== "success" && onClose()} />

      {/* Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        {step !== "success" && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button onClick={() => setStep(STEPS[stepIdx - 1])} className="p-1 text-slate-400 hover:text-slate-700">
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="font-bold text-slate-800">
                {step === "cart" ? "Your Cart" : step === "delivery" ? "Delivery Details" : "Payment"}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Step progress */}
        {step !== "success" && (
          <div className="flex gap-1 px-5 pt-3">
            {STEPS.map((s, i) => (
              <div key={s} className={clsx("flex-1 h-1 rounded-full transition-colors", i <= stepIdx ? "bg-brand-500" : "bg-slate-200")} />
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── STEP: Cart ── */}
          {step === "cart" && (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="text-2xl">{item.product.product_type === "bundle" ? "💧" : item.product.product_type === "refill" ? "♻️" : "📦"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{item.product.size_label} · PKR {item.product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-800 w-20 text-right">
                    PKR {(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}

              {/* Note */}
              <div className="pt-2">
                <label className="label">Special Instructions (optional)</label>
                <textarea className="input resize-none text-sm" rows={2}
                  placeholder="Leave at gate, ring doorbell, etc."
                  value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── STEP: Delivery ── */}
          {step === "delivery" && (
            <div className="space-y-5">

              {/* Addresses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Delivery Address</label>
                  <button onClick={() => setShowAddAddress(!showAddAddress)}
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add new
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="bg-slate-50 rounded-xl p-4 mb-3 space-y-3">
                    <div>
                      <label className="label text-xs">Label</label>
                      <input className="input text-sm" placeholder="Home / Office / Other"
                        value={newAddr.label} onChange={(e) => setNewAddr((a) => ({ ...a, label: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Street Address <span className="text-red-500">*</span></label>
                      <input className="input text-sm" placeholder="House 5, Street 12, Sector G-11"
                        value={newAddr.address_line1} onChange={(e) => setNewAddr((a) => ({ ...a, address_line1: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="label text-xs">City</label>
                      <input className="input text-sm" value={newAddr.city}
                        onChange={(e) => setNewAddr((a) => ({ ...a, city: e.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={newAddr.is_default}
                        onChange={(e) => setNewAddr((a) => ({ ...a, is_default: e.target.checked }))} />
                      Set as default
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAddAddress(false)} className="btn-secondary btn-sm flex-1">Cancel</button>
                      <button type="submit" className="btn-primary btn-sm flex-1" disabled={isPending}>Save</button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 && !showAddAddress && (
                  <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                    No addresses saved — add one above
                  </div>
                )}

                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className={clsx(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      addressId === a.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input type="radio" name="address" value={a.id} checked={addressId === a.id}
                        onChange={() => setAddressId(a.id)} className="accent-brand-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                        <p className="text-xs text-slate-500">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}</p>
                        <p className="text-xs text-slate-400">{a.city}</p>
                      </div>
                      {a.is_default && <span className="badge bg-brand-100 text-brand-700 text-xs ml-auto">Default</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <div>
                <label className="label">Delivery Date</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => (
                    <button key={d} onClick={() => setDeliveryDate(d)}
                      className={clsx(
                        "flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap",
                        deliveryDate === d
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}>
                      {formatDateLabel(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot */}
              <div>
                <label className="label">Time Slot</label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <button key={slot.id} onClick={() => setSlotId(slot.id)}
                      className={clsx(
                        "p-3 rounded-xl border text-sm font-medium text-left transition-colors",
                        slotId === slot.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}>
                      <p>{slot.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{slot.start_time} – {slot.end_time}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Payment ── */}
          {step === "payment" && (
            <div className="space-y-5">

              {/* Payment method */}
              <div>
                <label className="label">Payment Method</label>
                <div className="space-y-2">
                  {enabledPayments.map((m) => (
                    <label key={m} className={clsx(
                      "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                      paymentMethod === m ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input type="radio" name="payment" value={m} checked={paymentMethod === m}
                        onChange={() => setPaymentMethod(m as any)} className="accent-brand-600" />
                      <span className="text-brand-600">{PAYMENT_ICONS[m]}</span>
                      <span className="text-sm font-medium text-slate-800">{PAYMENT_LABELS[m]}</span>
                    </label>
                  ))}
                </div>
                {paymentMethod === "credit" && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2 flex items-center gap-1.5">
                    <AlertCircle size={12} /> Amount will be added to your account balance
                  </p>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Summary</p>
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.product.name} <span className="text-slate-400">× {item.quantity}</span></span>
                    <span className="font-medium">PKR {(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-slate-500 pt-1 border-t border-slate-200">
                    <span>Delivery Fee</span><span>PKR {deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Total</span><span>PKR {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Success ── */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Order Placed!</h2>
                <p className="text-slate-500 mt-1">Order #{completedOrder?.order_number}</p>
                <p className="text-sm text-slate-400 mt-2">
                  We'll notify you when your order is confirmed. Check your email for details.
                </p>
              </div>
              <button onClick={onClose} className="btn-primary w-full py-3 mt-2">
                Back to Products
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step !== "success" && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            {/* Total */}
            <div className="flex justify-between text-sm font-medium text-slate-700">
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              <span>Total: <strong className="text-slate-900">PKR {total.toLocaleString()}</strong>
                {deliveryFee > 0 && <span className="text-xs text-slate-400 font-normal"> (incl. PKR {deliveryFee} delivery)</span>}
              </span>
            </div>

            {step === "cart" && (
              <button onClick={() => setStep("delivery")} disabled={cart.length === 0}
                className="btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2">
                Continue to Delivery <ChevronRight size={18} />
              </button>
            )}
            {step === "delivery" && (
              <button onClick={() => { if (!addressId) { toast.error("Select an address"); return; } if (!slotId) { toast.error("Select a time slot"); return; } setStep("payment"); }}
                className="btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2">
                Continue to Payment <ChevronRight size={18} />
              </button>
            )}
            {step === "payment" && (
              <button onClick={handlePlaceOrder} disabled={isPending}
                className="btn-primary w-full py-3 text-base font-bold disabled:opacity-60">
                {isPending ? "Placing order…" : `Place Order · PKR ${total.toLocaleString()}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
