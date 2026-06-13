"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cancelOrder } from "../actions";
import toast from "react-hot-toast";
import type { OrderRow } from "./OrdersClient";

interface Props {
  order: OrderRow;
  onClose: () => void;
  onUpdated: (updated: OrderRow) => void;
}

export default function CancelOrderModal({ order, onClose, onUpdated }: Props) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      const res = await cancelOrder(order.id, reason.trim());
      if (res.error) { toast.error(res.error); return; }
      toast.success("Order cancelled");
      onUpdated({ ...order, status: "cancelled" });
      onClose();
    });
  }

  return (
    <Modal
      title={`Cancel Order #${order.order_number}`}
      icon={<XCircle size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Keep Order</button>
          <button
            onClick={handle}
            disabled={pending}
            className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
          >
            {pending ? "Cancelling…" : "Yes, Cancel"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 mb-4">
        This will cancel the order. The customer will not be automatically notified.
      </p>
      <div>
        <label className="label">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          rows={3}
          placeholder="e.g. Customer requested cancellation"
        />
      </div>
    </Modal>
  );
}
