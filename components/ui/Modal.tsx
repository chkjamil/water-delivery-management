"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  title:      string;
  icon?:      React.ReactNode;
  onClose:    () => void;
  children:   React.ReactNode;
  footer?:    React.ReactNode;
  size?:      "sm" | "md" | "lg";
  /** Extra classes for the inner panel */
  className?: string;
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

/**
 * Shared modal shell used by every feature modal.
 * Handles backdrop, scroll-lock, escape key, and responsive bottom-sheet on mobile.
 */
export default function Modal({ title, icon, onClose, children, footer, size = "md", className }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={clsx(
          "bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col",
          SIZE[size],
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {icon && <span className="text-brand-600">{icon}</span>}
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
