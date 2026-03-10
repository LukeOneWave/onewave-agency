"use client";

import { useOrchestrationStore } from "@/store/orchestration";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Square } from "lucide-react";

export function MissionHeader() {
  const brief = useOrchestrationStore((s) => s.brief);
  const missionStatus = useOrchestrationStore((s) => s.missionStatus);
  const lanes = useOrchestrationStore((s) => s.lanes);
  const stopMission = useOrchestrationStore((s) => s.stopMission);

  const agentCount = Object.keys(lanes).length;

  return (
    <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
      <div className="flex items-center gap-4 min-w-0">
        <StatusIcon status={missionStatus} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-md">{brief}</p>
          <p className="text-xs text-muted-foreground">
            {agentCount} agent{agentCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {missionStatus === "streaming" && (
        <Button variant="outline" size="sm" onClick={stopMission}>
          <Square className="mr-2 h-3 w-3 fill-current" />
          Stop Mission
        </Button>
      )}
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status: "idle" | "creating" | "streaming" | "done" | "error";
}) {
  switch (status) {
    case "streaming":
    case "creating":
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    case "done":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    default:
      return null;
  }
}
