"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { assignDriver } from "../actions";
import toast from "react-hot-toast";
import type { DeliveryRow, DriverOption } from "./DeliveriesClient";

interface Props {
  delivery: DeliveryRow;
  drivers: DriverOption[];
  onClose: () => void;
  onUpdated: (updated: DeliveryRow) => void;
}

export default function AssignDriverModal({ delivery, drivers, onClose, onUpdated }: Props) {
  const [driverId, setDriverId] = useState(delivery.driver?.id ?? "");
  const [pending, start] = useTransition();

  function handle() {
    if (!driverId) { toast.error("Select a driver"); return; }
    start(async () => {
      const res = await assignDriver(delivery.id, driverId);
      if (res.error) { toast.error(res.error); return; }
      const driver = drivers.find((d) => d.id === driverId) ?? null;
      toast.success("Driver assigned");
      onUpdated({ ...delivery, status: "assigned", driver: driver ? { id: driver.id, full_name: driver.full_name, phone: driver.phone } : null });
      onClose();
    });
  }

  return (
    <Modal
      title="Assign Driver"
      icon={<UserCheck size={16} />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={pending} className="btn-primary">
            {pending ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Order <strong className="text-slate-700">#{delivery.order?.order_number}</strong>
        </p>
        <div>
          <label className="label">Select Driver</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="input">
            <option value="">— Choose a driver —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}{d.phone ? ` · ${d.phone}` : ""}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
