import { Skeleton, FormSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Tab bar */}
      <Skeleton className="h-10 w-52 rounded-xl" />
      {/* Cards */}
      <div className="space-y-4">
        <div className="card p-6"><FormSkeleton fields={2} /></div>
        <div className="card p-6"><FormSkeleton fields={2} /></div>
      </div>
    </div>
  );
}
