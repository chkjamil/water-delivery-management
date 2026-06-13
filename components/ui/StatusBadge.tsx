import { clsx } from "clsx";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",    color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed",  color: "bg-blue-100 text-blue-700" },
  dispatched:{ label: "Dispatched", color: "bg-purple-100 text-purple-700" },
  en_route:  { label: "En Route",   color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered",  color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled",  color: "bg-red-100 text-red-700" },
  failed:    { label: "Failed",     color: "bg-red-100 text-red-700" },
};

const DELIVERY_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: "Pending",     color: "bg-yellow-100 text-yellow-700" },
  assigned:    { label: "Assigned",    color: "bg-blue-100 text-blue-700" },
  loaded:      { label: "Loaded",      color: "bg-cyan-100 text-cyan-700" },
  en_route:    { label: "En Route",    color: "bg-indigo-100 text-indigo-700" },
  delivered:   { label: "Delivered",   color: "bg-green-100 text-green-700" },
  failed:      { label: "Failed",      color: "bg-red-100 text-red-700" },
  rescheduled: { label: "Rescheduled", color: "bg-amber-100 text-amber-700" },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  unpaid:   { label: "Unpaid",   color: "bg-red-100 text-red-700" },
  partial:  { label: "Partial",  color: "bg-amber-100 text-amber-700" },
  paid:     { label: "Paid",     color: "bg-green-100 text-green-700" },
  refunded: { label: "Refunded", color: "bg-slate-100 text-slate-600" },
};

interface Props {
  status: string;
  type?: "order" | "delivery" | "payment";
  className?: string;
}

export default function StatusBadge({ status, type = "order", className }: Props) {
  const map = type === "delivery" ? DELIVERY_STATUS : type === "payment" ? PAYMENT_STATUS : ORDER_STATUS;
  const cfg = map[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={clsx("badge text-xs font-medium", cfg.color, className)}>
      {cfg.label}
    </span>
  );
}
