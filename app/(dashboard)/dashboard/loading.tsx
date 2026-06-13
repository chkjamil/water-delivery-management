import { StatRowSkeleton, TableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <StatRowSkeleton cols={4} />
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <TableSkeleton rows={4} cols={3} />
        </div>
        <div className="card p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    </div>
  );
}
