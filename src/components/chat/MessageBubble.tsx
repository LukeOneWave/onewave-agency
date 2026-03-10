"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { StreamingIndicator } from "./StreamingIndicator";
import { parseDeliverables } from "@/lib/deliverable-parser";
import { ReviewPanel } from "./ReviewPanel";
import { useChatStore } from "@/store/chat";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  isStreaming?: boolean;
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

        return (
          <div
            key={i}
            className="rounded-lg border border-primary/20 p-4 bg-muted/30"
          >
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {segment.content}
              </ReactMarkdown>
            </div>
            <ReviewPanel
              messageId={messageId}
              deliverableIndex={segment.index}
              status={status}
              onApprove={() => approveDeliverable(messageId, segment.index)}
              onRequestRevision={(feedback) =>
                requestRevision(messageId, segment.index, feedback)
              }
            />
          </div>
        );
      })}
    </div>
  );
}
