import { FormSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-28" />
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
      </div>
      <div className="card p-6 max-w-xl">
        <FormSkeleton fields={5} />
      </div>
    </div>
  );
}
