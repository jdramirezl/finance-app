// Reusable skeleton loading components

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
};

export const SkeletonAccountCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Table header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-gray-200 dark:border-gray-700 p-4 last:border-b-0"
        >
          <div className="flex gap-4 items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonList = ({ items = 3 }: { items?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};
