import { clsx } from "clsx";

interface Props {
  icon?:    React.ReactNode;
  title:    string;
  body?:    string;
  action?:  React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state used across tables and lists.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Package size={40} />}
 *     title="No products yet"
 *     body='Click "Add Product" to get started.'
 *   />
 */
export default function EmptyState({ icon, title, body, action, className }: Props) {
  return (
    <div className={clsx("card flex flex-col items-center justify-center py-14 px-6 text-center", className)}>
      {icon && (
        <div className="text-slate-300 mb-3">{icon}</div>
      )}
      <p className="font-semibold text-slate-500">{title}</p>
      {body  && <p className="text-sm text-slate-400 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
