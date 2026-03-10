"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MissionHeader } from "@/components/orchestration/MissionHeader";
import { MissionLanes } from "@/components/orchestration/MissionLanes";
import { useOrchestrationStore } from "@/store/orchestration";

export default function MissionPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const missionStatus = useOrchestrationStore((s) => s.missionStatus);
  const connectStream = useOrchestrationStore((s) => s.connectStream);

  useEffect(() => {
    if (missionId && missionStatus === "idle") {
      connectStream(missionId);
    }
  }, [missionId, missionStatus, connectStream]);

  return (
    <div className="flex flex-col h-full">
      <MissionHeader />
      <MissionLanes />
    </div>
  );
}
