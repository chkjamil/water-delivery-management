interface Props {
  title:    string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Consistent page title + subtitle + optional action buttons.
 * Used at the top of every dashboard page.
 */
export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
