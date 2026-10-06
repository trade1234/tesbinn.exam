export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="card min-w-0 overflow-hidden" role="status" aria-label="Loading">
      <div className="hidden gap-4 bg-blue-50 px-4 py-3 dark:bg-[#17324d] md:grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-2/3" />)}
      </div>
      <div className="divide-y divide-blue-50 dark:divide-slate-800">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="grid gap-3 px-4 py-4 md:gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }, (_, column) => <Skeleton key={column} className={`h-4 ${column === 0 ? "w-4/5" : "w-3/5"}`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card space-y-3 p-5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <StatsSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}
