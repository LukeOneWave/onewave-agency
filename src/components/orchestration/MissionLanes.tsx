"use client";

import { useOrchestrationStore } from "@/store/orchestration";
import { AgentLane } from "./AgentLane";
import { cn } from "@/lib/utils";

export function MissionLanes() {
  const lanes = useOrchestrationStore((s) => s.lanes);
  const laneIds = Object.keys(lanes);

  if (laneIds.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted-foreground">
        No agents assigned to this mission.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 flex-1 auto-rows-fr p-4",
        laneIds.length === 1 && "grid-cols-1",
        laneIds.length === 2 && "grid-cols-1 md:grid-cols-2",
        laneIds.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {laneIds.map((agentId) => (
        <AgentLane key={agentId} agentId={agentId} />
      ))}
    </div>
  );
}
