import { StatRowSkeleton, TableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-5">
      {/* Page title */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats row */}
      <StatRowSkeleton cols={4} />

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Table */}
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
