"use client";

import { useState, useTransition } from "react";
import { DollarSign } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { recordPayment } from "../actions";
import { formatPKR } from "@/lib/format";
import toast from "react-hot-toast";
import type { OrderRow } from "./OrdersClient";

const METHODS = ["cash", "card", "easypaisa", "jazzcash", "bank"];

interface Props {
  order: OrderRow;
  onClose: () => void;
  onUpdated: (updated: OrderRow) => void;
}

export default function RecordPaymentModal({ order, onClose, onUpdated }: Props) {
  const [amount, setAmount] = useState(String(order.total_amount - (order.amount_paid ?? 0)));
  const [method, setMethod] = useState(order.payment_method ?? "cash");
  const [pending, start] = useTransition();

  const remaining = order.total_amount - (order.amount_paid ?? 0);

  function handle() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > remaining + 0.01) { toast.error("Amount exceeds remaining balance"); return; }
    start(async () => {
      const res = await recordPayment(order.id, amt, method);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Payment recorded");
      const newPaid = (order.amount_paid ?? 0) + amt;
      const newStatus = newPaid >= order.total_amount ? "paid" : newPaid > 0 ? "partial" : "unpaid";
      onUpdated({ ...order, amount_paid: newPaid, payment_status: newStatus, payment_method: method });
      onClose();
    });
  }

  return (
    <Modal
      title={`Record Payment — #${order.order_number}`}
      icon={<DollarSign size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Record Payment"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-medium">{formatPKR(order.total_amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Already paid</span><span className="font-medium text-green-600">{formatPKR(order.amount_paid ?? 0)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-slate-700 font-semibold">Remaining</span><span className="font-bold text-red-600">{formatPKR(remaining)}</span></div>
        </div>

        <div>
          <label className="label">Amount Received</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            min={0}
            max={remaining}
            step={1}
          />
        </div>

        <div>
          <label className="label">Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input capitalize">
            {METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
