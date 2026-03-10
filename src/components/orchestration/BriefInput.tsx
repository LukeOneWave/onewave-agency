"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CLAUDE_MODELS } from "@/types/chat";
import { Rocket } from "lucide-react";

interface BriefInputProps {
  brief: string;
  onBriefChange: (s: string) => void;
  model: string;
  onModelChange: (s: string) => void;
  onLaunch: () => void;
  disabled: boolean;
  agentCount: number;
}

export function BriefInput({
  brief,
  onBriefChange,
  model,
  onModelChange,
  onLaunch,
  disabled,
  agentCount,
}: BriefInputProps) {
  const canLaunch = agentCount > 0 && brief.trim().length > 0 && !disabled;

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="mission-brief"
          className="block text-sm font-medium mb-2"
        >
          Mission Brief
        </label>
        <Textarea
          id="mission-brief"
          placeholder="Describe the mission objective for your agents..."
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {brief.length} characters
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="model-select" className="block text-sm font-medium mb-2">
            Model
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {CLAUDE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - {m.description}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={onLaunch} disabled={!canLaunch} size="lg">
          <Rocket className="mr-2 h-4 w-4" />
          Launch Mission
          {agentCount > 0 && ` (${agentCount} agent${agentCount !== 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  );
}
