interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className || ""}`}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-3xl overflow-hidden shadow-sm border border-border/40 bg-surface h-[260px]">
      <Skeleton className="w-full h-[160px] rounded-none" />
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-auto flex justify-between items-center">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="mb-4 bg-surface rounded-2xl p-4 shadow-sm border border-border/40">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-3" />
      <Skeleton className="w-full h-48 rounded-xl mb-3" />
      <div className="flex gap-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function AccommodationCardSkeleton() {
  return (
    <div className="flex flex-col rounded-3xl overflow-hidden shadow-sm border border-border/40 bg-surface h-[280px]">
      <Skeleton className="w-full h-[180px] rounded-none" />
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-2/3" />
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
