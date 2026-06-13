import { Mail, Phone } from "lucide-react";

interface Props {
  type:     "email" | "phone";
  verified: boolean;
  /** If false and no phone number saved, shows "not set" variant */
  hasValue?: boolean;
  /** Click handler — e.g. for admin manual verify */
  onVerify?: () => void;
}

/**
 * Consistent email/phone verification badge.
 * Shows green ✓ if verified, amber ⚠ if not.
 * If onVerify is provided the badge becomes a clickable button for admins.
 */
export default function VerificationBadge({ type, verified, hasValue = true, onVerify }: Props) {
  const Icon  = type === "email" ? Mail : Phone;
  const label = type === "email" ? "Email" : "Phone";

  if (verified) {
    return (
      <span className="badge bg-green-100 text-green-700 text-xs inline-flex items-center gap-1">
        <Icon size={10} /> {label} ✓
      </span>
    );
  }

  if (!hasValue) {
    return (
      <span className="badge bg-slate-100 text-slate-400 text-xs inline-flex items-center gap-1">
        <Icon size={10} /> {label} —
      </span>
    );
  }

  if (onVerify) {
    return (
      <button
        onClick={onVerify}
        className="badge bg-amber-100 text-amber-700 text-xs inline-flex items-center gap-1 hover:bg-amber-200 transition-colors cursor-pointer"
        title={`Click to manually mark ${label.toLowerCase()} as verified`}
      >
        <Icon size={10} /> {label} ⚠ verify
      </button>
    );
  }

  return (
    <span className="badge bg-amber-100 text-amber-700 text-xs inline-flex items-center gap-1">
      <Icon size={10} /> {label} ⚠
    </span>
  );
}
