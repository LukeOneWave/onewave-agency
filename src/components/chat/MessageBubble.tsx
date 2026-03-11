"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { StreamingIndicator } from "./StreamingIndicator";
import { parseDeliverables } from "@/lib/deliverable-parser";
import { ReviewPanel } from "./ReviewPanel";
import { InlineEditor } from "./InlineEditor";
import { DiffViewer } from "./DiffViewer";
import { useChatStore } from "@/store/chat";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  isStreaming?: boolean;
}

interface DeliverableRecord {
  id: string;
  index: number;
  content: string;
  status: string;
}

export function MessageBubble({
  role,
  content,
  messageId,
  isStreaming,
}: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        {content.length === 0 ? (
          <StreamingIndicator />
        ) : (
          <AssistantContent
            content={content}
            messageId={messageId}
            isStreaming={isStreaming}
          />
        )}
      </div>
    </div>
  );
}

function AssistantContent({
  content,
  messageId,
  isStreaming,
}: {
  content: string;
  messageId?: string;
  isStreaming?: boolean;
}) {
  const deliverables = useChatStore((s) => s.deliverables);
  const approveDeliverable = useChatStore((s) => s.approveDeliverable);
  const requestRevision = useChatStore((s) => s.requestRevision);

  // Fetch deliverable records to get their IDs for InlineEditor and DiffViewer
  const [deliverableRecords, setDeliverableRecords] = useState<
    DeliverableRecord[]
  >([]);

  useEffect(() => {
    if (!messageId || isStreaming) return;
    fetch(`/api/deliverables/${messageId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DeliverableRecord[]) => setDeliverableRecords(data))
      .catch(() => {});
  }, [messageId, isStreaming]);

  // Only parse deliverables after streaming completes and when we have a messageId
  if (isStreaming || !messageId) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  const parsed = parseDeliverables(content);

  if (!parsed.hasDeliverables) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Build index → deliverable record map
  const recordsByIndex = new Map(
    deliverableRecords.map((r) => [r.index, r])
  );

  // Render segments with deliverable blocks and ReviewPanels
  return (
    <div className="space-y-4">
      {parsed.segments.map((segment, i) => {
        if (segment.type === "text") {
          if (!segment.content.trim()) return null;
          return (
            <div key={i} className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {segment.content}
              </ReactMarkdown>
            </div>
          );
        }

        // Deliverable segment
        const key = `${messageId}-${segment.index}`;
        const status = deliverables[key]?.status ?? "pending";
        const deliverableRecord = recordsByIndex.get(segment.index);

        return (
          <div
            key={i}
            className="rounded-lg border border-primary/20 p-4 bg-muted/30"
          >
            {deliverableRecord ? (
              <InlineEditor
                deliverableId={deliverableRecord.id}
                messageId={messageId}
                deliverableIndex={segment.index}
                initialContent={segment.content}
                onSaved={() => {}}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {segment.content}
                </ReactMarkdown>
              </div>
            )}
            <ReviewPanel
              messageId={messageId}
              deliverableIndex={segment.index}
              status={status}
              onApprove={() => approveDeliverable(messageId, segment.index)}
              onRequestRevision={(feedback) =>
                requestRevision(messageId, segment.index, feedback)
              }
            />
            {deliverableRecord && (
              <DiffViewer
                deliverableId={deliverableRecord.id}
                currentContent={segment.content}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
