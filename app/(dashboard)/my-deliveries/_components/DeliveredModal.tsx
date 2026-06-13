"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { markDelivered } from "../actions";
import toast from "react-hot-toast";

interface Props {
  deliveryId: string;
  orderNumber: string;
  onClose: () => void;
  onDone: () => void;
}

export default function DeliveredModal({ deliveryId, orderNumber, onClose, onDone }: Props) {
  const [bottles, setBottles] = useState("0");
  const [pending, start] = useTransition();

  function handle() {
    const bottlesNum = parseInt(bottles) || 0;
    start(async () => {
      const res = await markDelivered(deliveryId, bottlesNum);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Delivery marked as delivered! 🎉");
      onDone();
      onClose();
    });
  }

  return (
    <Modal
      title={`Deliver Order #${orderNumber}`}
      icon={<CheckCircle size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Confirm Delivery"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          Confirming this will mark the order as delivered and notify the customer.
        </div>
        <div>
          <label className="label">Empty Bottles Collected</label>
          <input
            type="number"
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
            className="input text-center text-2xl font-bold h-16"
            min={0}
            step={1}
          />
          <p className="text-xs text-slate-400 mt-1">Enter 0 if no bottles were returned</p>
        </div>
      </div>
    </Modal>
  );
}
