import { clsx } from "clsx";

interface Props {
  label:     string;
  value:     string | number;
  icon:      React.ReactNode;
  iconBg?:   string;   // e.g. "bg-brand-50"
  iconColor?: string;  // e.g. "text-brand-600"
  valueColor?: string; // e.g. "text-red-600"
  sub?:      string;   // small subtitle below value
}

/**
 * Reusable stat card used in Inventory, Customers, Dashboard, etc.
 *
 * Usage:
 *   <StatCard
 *     label="Active Products"
 *     value={42}
 *     icon={<Package size={18} />}
 *     iconBg="bg-brand-50"
 *     iconColor="text-brand-600"
 *   />
 */
export default function StatCard({ label, value, icon, iconBg = "bg-slate-50", iconColor = "text-slate-600", valueColor, sub }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={clsx("p-2 rounded-lg flex-shrink-0", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className={clsx("text-2xl font-bold leading-tight", valueColor ?? "text-slate-800")}>
            {value}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
