import { StatRowSkeleton, TableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StatRowSkeleton cols={4} />
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>
      <TableSkeleton rows={7} cols={6} />
    </div>
  );
}
