"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentSelector } from "@/components/orchestration/AgentSelector";
import { BriefInput } from "@/components/orchestration/BriefInput";
import { useOrchestrationStore } from "@/store/orchestration";

interface AgentOption {
  id: string;
  name: string;
  description: string;
  division: string;
  color: string;
}

export function MissionCreator({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [launching, setLaunching] = useState(false);

  const createMission = useOrchestrationStore((s) => s.createMission);
  const missionId = useOrchestrationStore((s) => s.missionId);
  const missionStatus = useOrchestrationStore((s) => s.missionStatus);

  async function handleLaunch() {
    if (selectedIds.length === 0 || !brief.trim()) return;

    setLaunching(true);

    const selectedAgents = agents
      .filter((a) => selectedIds.includes(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        division: a.division,
        color: a.color,
      }));

    await createMission(selectedIds, brief.trim(), model, selectedAgents);

    // After createMission, the store has missionId set -- navigate
    const store = useOrchestrationStore.getState();
    if (store.missionId) {
      router.push(`/orchestration/${store.missionId}`);
    } else {
      setLaunching(false);
    }
  }

  return (
    <div className="space-y-8">
      <AgentSelector
        agents={agents}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <div className="border-t pt-6">
        <BriefInput
          brief={brief}
          onBriefChange={setBrief}
          model={model}
          onModelChange={setModel}
          onLaunch={handleLaunch}
          disabled={launching}
          agentCount={selectedIds.length}
        />
      </div>

      {missionStatus === "error" && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {useOrchestrationStore.getState().error || "Failed to create mission"}
        </div>
      )}
    </div>
  );
}
