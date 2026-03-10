"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrchestrationStore } from "@/store/orchestration";
import { parseDeliverables } from "@/lib/deliverable-parser";
import { ReviewPanel } from "@/components/chat/ReviewPanel";
import { cn } from "@/lib/utils";
import type { DeliverableStatus } from "@/types/chat";

const divisionColors: Record<string, string> = {
  engineering: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  design: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  product: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  marketing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  sales: "bg-green-500/15 text-green-700 dark:text-green-400",
  support: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  operations: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  finance: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  hr: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  legal: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

interface AgentLaneProps {
  agentId: string;
}

export function AgentLane({ agentId }: AgentLaneProps) {
  const lane = useOrchestrationStore((s) => s.lanes[agentId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deliverableStates, setDeliverableStates] = useState<
    Record<string, DeliverableStatus>
  >({});

  // Auto-scroll while streaming
  useEffect(() => {
    if (lane?.status === "streaming" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lane?.content, lane?.status]);

  if (!lane) return null;

  const colorClass =
    divisionColors[lane.division] ||
    "bg-gray-500/15 text-gray-700 dark:text-gray-400";

  const isDone = lane.status === "done";
  const isStreaming = lane.status === "streaming";
  const isError = lane.status === "error";

  // Parse deliverables only after lane completes
  const parsed = isDone ? parseDeliverables(lane.content) : null;

  function handleApprove(messageId: string, deliverableIndex: number) {
    const key = `${messageId}-${deliverableIndex}`;
    setDeliverableStates((prev) => ({ ...prev, [key]: "approved" }));

    fetch(`/api/chat/messages/${messageId}/deliverables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: deliverableIndex, action: "approve" }),
    }).catch(() => {
      // Revert on error
      setDeliverableStates((prev) => ({ ...prev, [key]: "pending" }));
    });
  }

  function handleRevise(
    messageId: string,
    deliverableIndex: number,
    feedback: string
  ) {
    const key = `${messageId}-${deliverableIndex}`;
    setDeliverableStates((prev) => ({ ...prev, [key]: "revised" }));

    fetch(`/api/chat/messages/${messageId}/deliverables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        index: deliverableIndex,
        action: "revise",
        feedback,
      }),
    }).catch(() => {
      setDeliverableStates((prev) => ({ ...prev, [key]: "pending" }));
    });
  }

  return (
    <Card className="flex flex-col min-h-[400px]">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={lane.status} />
            <span className="text-sm font-semibold truncate">
              {lane.agentName}
            </span>
          </div>
          <Badge variant="secondary" className={`shrink-0 text-xs ${colorClass}`}>
            {lane.division}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4" ref={scrollRef}>
          {lane.content.length === 0 && !isError ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              {lane.status === "pending" ? "Waiting to start..." : "Streaming..."}
            </div>
          ) : isError ? (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {lane.error || "An error occurred"}
            </div>
          ) : isDone && parsed?.hasDeliverables && lane.messageId ? (
            <div className="space-y-4">
              {parsed.segments.map((segment, i) => {
                if (segment.type === "text") {
                  if (!segment.content.trim()) return null;
                  return (
                    <div key={i} className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {segment.content}
                      </ReactMarkdown>
                    </div>
                  );
                }

                const key = `${lane.messageId}-${segment.index}`;
                const status = deliverableStates[key] ?? "pending";

                return (
                  <div
                    key={i}
                    className="rounded-lg border border-primary/20 p-4 bg-muted/30"
                  >
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {segment.content}
                      </ReactMarkdown>
                    </div>
                    <ReviewPanel
                      messageId={lane.messageId!}
                      deliverableIndex={segment.index}
                      status={status}
                      onApprove={() =>
                        handleApprove(lane.messageId!, segment.index)
                      }
                      onRequestRevision={(feedback) =>
                        handleRevise(lane.messageId!, segment.index, feedback)
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {lane.content}
              </ReactMarkdown>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full shrink-0",
        status === "streaming" && "bg-blue-500 animate-pulse",
        status === "done" && "bg-green-500",
        status === "error" && "bg-red-500",
        status === "pending" && "bg-gray-400"
      )}
    />
  );
}
