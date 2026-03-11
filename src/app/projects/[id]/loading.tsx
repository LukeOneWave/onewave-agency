export default function ProjectDetailLoading() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto animate-pulse">
      {/* Title skeleton */}
      <div className="mb-6">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="h-4 w-96 rounded-lg bg-muted mt-2" />
      </div>

      {/* Progress summary skeleton */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>

      {/* Add Task button skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-10 rounded bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>

      {/* 4-column Kanban skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-4 w-6 rounded-full bg-muted" />
            </div>
            {/* Column body */}
            <div className="min-h-[200px] space-y-2 rounded-lg bg-muted/30 p-2">
              {Array.from({ length: i === 0 ? 3 : i === 1 ? 2 : 1 }).map((_, j) => (
                <div
                  key={j}
                  className="h-16 rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
