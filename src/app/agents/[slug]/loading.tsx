import { Skeleton } from "@/components/ui/skeleton";

export default function AgentDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Skeleton className="h-5 w-40 mb-6" />

      {/* Agent header card */}
      <div className="rounded-2xl bg-card p-6 shadow-sm mb-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-20 rounded-lg mt-1" />
        </div>
        <Skeleton className="h-6 w-full mt-2" />
        <Skeleton className="h-10 w-36 mt-4 rounded-md" />
      </div>

      {/* Tools card */}
      <div className="rounded-2xl bg-card p-6 shadow-sm mb-6">
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* System prompt card */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <Skeleton className="h-4 w-28 mb-4" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
