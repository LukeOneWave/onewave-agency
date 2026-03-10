"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { DeliverableStatus } from "@/types/chat";

interface ReviewPanelProps {
  messageId: string;
  deliverableIndex: number;
  status: DeliverableStatus;
  onApprove: () => void;
  onRequestRevision: (feedback: string) => void;
}

export function ReviewPanel({
  status,
  onApprove,
  onRequestRevision,
}: ReviewPanelProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const isPending = status === "pending";

  function handleReviseClick() {
    setShowFeedback(true);
  }

  function handleSubmitFeedback() {
    if (feedbackText.trim()) {
      onRequestRevision(feedbackText.trim());
      setFeedbackText("");
      setShowFeedback(false);
    }
  }

  return (
    <div className="border-t border-border/50 pt-3 mt-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />

        <Button
          size="sm"
          disabled={!isPending}
          onClick={onApprove}
        >
          <Check data-icon="inline-start" />
          Approve
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!isPending}
          onClick={handleReviseClick}
        >
          <RotateCcw data-icon="inline-start" />
          Request Revision
        </Button>
      </div>

      {showFeedback && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Describe what changes you'd like..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <Button size="sm" onClick={handleSubmitFeedback}>
            Send Feedback
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DeliverableStatus }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
          Approved
        </Badge>
      );
    case "revised":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          Revision Requested
        </Badge>
      );
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}
