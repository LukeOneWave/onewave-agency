"use client";

import { CLAUDE_MODELS } from "@/types/chat";
import { useChatStore } from "@/store/chat";

export function ModelSelector() {
  const { selectedModel, setModel, isStreaming } = useChatStore();

  return (
    <select
      value={selectedModel}
      onChange={(e) => setModel(e.target.value)}
      disabled={isStreaming}
      className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      {CLAUDE_MODELS.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} - {model.description}
        </option>
      ))}
    </select>
  );
}
