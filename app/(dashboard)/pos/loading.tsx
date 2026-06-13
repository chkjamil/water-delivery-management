import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function POSLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-120px)] min-h-[600px]">
        {/* Product grid */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
          </div>
          <CardGridSkeleton count={12} />
        </div>

        {/* Cart sidebar */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
          <div className="card flex flex-col h-full p-4 space-y-4">
            <Skeleton className="h-5 w-20" />
            <div className="flex-1 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="flex-1 h-10" />
                  <Skeleton className="w-20 h-10" />
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
