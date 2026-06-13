"use client";

import { useState, useTransition } from "react";
import { Truck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { updateDeliveryStatus } from "../actions";
import toast from "react-hot-toast";
import type { DeliveryRow } from "./DeliveriesClient";

const TRANSITIONS: Record<string, { label: string; value: string }[]> = {
  assigned:  [{ label: "Mark Loaded",    value: "loaded" }],
  loaded:    [{ label: "Mark En Route",  value: "en_route" }],
  en_route:  [{ label: "Mark Delivered", value: "delivered" }, { label: "Mark Failed", value: "failed" }],
};

const FAILED_REASONS = [
  "Customer not available",
  "Wrong address",
  "Customer refused",
  "Vehicle breakdown",
  "Out of stock",
  "Other",
];

interface Props {
  delivery: DeliveryRow;
  onClose: () => void;
  onUpdated: (updated: DeliveryRow) => void;
}

export default function UpdateDeliveryModal({ delivery, onClose, onUpdated }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [failedReason, setFailedReason] = useState(FAILED_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  const transitions = TRANSITIONS[delivery.status] ?? [];

  function handle() {
    if (!selectedStatus) { toast.error("Select a status"); return; }
    start(async () => {
      const res = await updateDeliveryStatus(delivery.id, selectedStatus, {
        failedReason: selectedStatus === "failed" ? failedReason : undefined,
        notes: notes.trim() || undefined,
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Delivery updated");
      onUpdated({ ...delivery, status: selectedStatus });
      onClose();
    });
  }

  if (transitions.length === 0) {
    return (
      <Modal title="Update Delivery" onClose={onClose} size="sm">
        <p className="text-sm text-slate-500">No transitions available for this delivery status.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Update Delivery Status"
      icon={<Truck size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending || !selectedStatus} className="btn-primary">
            {pending ? "Updating…" : "Update"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Order <strong className="text-slate-700">#{delivery.order?.order_number}</strong>
        </p>

        <div className="flex flex-col gap-2">
          {transitions.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedStatus(t.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                selectedStatus === t.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {selectedStatus === "failed" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="label">Reason</label>
              <select value={failedReason} onChange={(e) => setFailedReason(e.target.value)} className="input">
                {FAILED_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
