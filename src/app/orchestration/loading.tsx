import { Skeleton } from "@/components/ui/skeleton";

export default function OrchestrationLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 mt-1" />
      </div>

      {/* MissionCreator form area */}
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
