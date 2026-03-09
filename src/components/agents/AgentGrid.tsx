import { AgentCard } from "./AgentCard";
import type { AgentCardData } from "@/types/agent";

export function AgentGrid({ agents }: { agents: AgentCardData[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No agents found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or clearing the division filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard key={agent.slug} agent={agent} />
      ))}
    </div>
  );
}
