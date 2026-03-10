"use client";

import { MissionHeader } from "@/components/orchestration/MissionHeader";
import { MissionLanes } from "@/components/orchestration/MissionLanes";

export default function MissionPage() {
  return (
    <div className="flex flex-col h-full">
      <MissionHeader />
      <MissionLanes />
    </div>
  );
}
