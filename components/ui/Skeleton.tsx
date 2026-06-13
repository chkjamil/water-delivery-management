import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Base pulsing skeleton block */
export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={clsx("animate-pulse bg-slate-200 rounded-lg", className)} style={style} />;
}

/** 4-column stat card row skeleton */
export function StatRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {[...Array(cols)].map((_, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table skeleton with N rows */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex gap-4 px-5 py-3 border-b border-slate-200 bg-slate-50">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-50 last:border-0">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" style={{ opacity: 1 - j * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card grid skeleton (for POS product grid) */
export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card p-3 space-y-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-5 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Form skeleton */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full mt-2" />
    </div>
  );
}
