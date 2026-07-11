"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { skipStop } from "../actions";
import toast from "react-hot-toast";
import type { MyStopRow } from "./MyStopsClient";

export default function SkipStopModal({
  stop, onClose, onDone,
}: { stop: MyStopRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function handle() {
    if (!reason.trim()) { toast.error("Enter a reason"); return; }
    start(async () => {
      const res = await skipStop(stop.id, reason.trim());
      if (res.error) { toast.error(res.error); return; }
      toast.success("Stop marked as skipped");
      onDone();
      onClose();
    });
  }

  return (
    <Modal
      title={`Skip Delivery — ${stop.customer?.full_name ?? "Customer"}`}
      icon={<XCircle size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-primary bg-red-600 hover:bg-red-700">
            {pending ? "Saving…" : "Confirm Skip"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          No order will be created. Admins will be notified.
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea className="input" rows={3} placeholder="Customer not home, gate locked, etc."
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
