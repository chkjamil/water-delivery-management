"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { updateOrderStatus } from "../actions";
import toast from "react-hot-toast";
import type { OrderRow } from "./OrdersClient";

const TRANSITIONS: Record<string, { label: string; value: string; color: string }[]> = {
  pending:   [{ label: "Confirm Order",  value: "confirmed",  color: "btn-primary" }, { label: "Cancel",  value: "cancelled", color: "btn-danger" }],
  confirmed: [{ label: "Mark Dispatched",value: "dispatched", color: "btn-primary" }, { label: "Cancel",  value: "cancelled", color: "btn-danger" }],
  dispatched:[{ label: "Mark En Route",  value: "en_route",   color: "btn-primary" }],
  en_route:  [{ label: "Mark Delivered", value: "delivered",  color: "btn-primary" }, { label: "Failed",  value: "failed",    color: "btn-danger" }],
};

interface Props {
  order: OrderRow;
  onClose: () => void;
  onUpdated: (updated: OrderRow) => void;
}

export default function UpdateStatusModal({ order, onClose, onUpdated }: Props) {
  const [pending, start] = useTransition();
  const transitions = TRANSITIONS[order.status] ?? [];

  function handle(newStatus: string) {
    start(async () => {
      const res = await updateOrderStatus(order.id, newStatus);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Order status updated");
      onUpdated({ ...order, status: newStatus });
      onClose();
    });
  }

  if (transitions.length === 0) {
    return (
      <Modal title="Update Status" onClose={onClose}>
        <p className="text-sm text-slate-500">No further status transitions available for this order.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Update Order #${order.order_number}`}
      icon={<CheckCircle size={16} />}
      onClose={onClose}
      size="sm"
    >
      <p className="text-sm text-slate-500 mb-4">
        Current status: <strong className="text-slate-700 capitalize">{order.status.replace("_", " ")}</strong>
      </p>
      <div className="flex flex-col gap-2">
        {transitions.map((t) => (
          <button
            key={t.value}
            onClick={() => handle(t.value)}
            disabled={pending}
            className={`${t.color === "btn-danger" ? "btn-secondary text-red-600 hover:bg-red-50 border-red-200" : "btn-primary"} w-full justify-center`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
