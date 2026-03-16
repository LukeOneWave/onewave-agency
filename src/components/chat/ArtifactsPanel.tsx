"use client";

import { useChatStore } from "@/store/chat";

export function ArtifactsPanel() {
  const activeDeliverableId = useChatStore((s) => s.activeDeliverableId);

  return (
    <div className="flex h-full flex-col border-l bg-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Artifacts</h2>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        {activeDeliverableId ? (
          <p>Preview for {activeDeliverableId}</p>
        ) : (
          <p>Select a deliverable to preview</p>
        )}
      </div>
    </div>
  );
}
