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
      {agents.map((agent, i) => (
        <div
          key={agent.slug}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 fill-mode-both"
          style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
        >
          <AgentCard agent={agent} />
        </div>
      ))}
    </div>
  );
}
