"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MissionHeader } from "@/components/orchestration/MissionHeader";
import { MissionLanes } from "@/components/orchestration/MissionLanes";
import { ReviewBoard } from "@/components/orchestration/ReviewBoard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  const showTabs = missionStatus !== "idle";

  return (
    <div className="flex flex-col h-full">
      <MissionHeader />

      {showTabs ? (
        <div className="flex-1 overflow-hidden flex flex-col px-4 pt-4">
          <Tabs defaultValue="lanes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit">
              <TabsTrigger value="lanes">Lanes</TabsTrigger>
              <TabsTrigger value="review-board">Review Board</TabsTrigger>
            </TabsList>

            <TabsContent value="lanes" className="flex-1 overflow-hidden mt-0">
              <MissionLanes />
            </TabsContent>

            <TabsContent value="review-board" className="overflow-auto py-4">
              <ReviewBoard missionId={missionId} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <MissionLanes />
      )}
    </div>
  );
}
