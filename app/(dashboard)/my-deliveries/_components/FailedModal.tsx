"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { markFailed } from "../actions";
import toast from "react-hot-toast";

const REASONS = [
  "Customer not available",
  "Wrong address",
  "Customer refused delivery",
  "Vehicle breakdown",
  "Weather conditions",
  "Other",
];

interface Props {
  deliveryId: string;
  orderNumber: string;
  onClose: () => void;
  onDone: () => void;
}

export default function FailedModal({ deliveryId, orderNumber, onClose, onDone }: Props) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      const res = await markFailed(deliveryId, reason, notes.trim());
      if (res.error) { toast.error(res.error); return; }
      toast.success("Delivery marked as failed");
      onDone();
      onClose();
    });
  }

  return (
    <Modal
      title={`Failed Delivery — #${orderNumber}`}
      icon={<XCircle size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-secondary text-red-600 hover:bg-red-50 border-red-200">
            {pending ? "Saving…" : "Mark as Failed"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Additional Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={3}
            placeholder="Any extra details…"
          />
        </div>
      </div>
    </Modal>
  );
}
