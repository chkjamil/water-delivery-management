import { Skeleton, CardGridSkeleton } from "@/components/ui/Skeleton";

export default function OrderLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-4 w-24" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
