"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/store/chat";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { ArtifactsPanel } from "./ArtifactsPanel";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { ProjectSelector } from "./ProjectSelector";

interface ChatSession {
  id: string;
  agent: {
    slug: string;
    name: string;
    division: string;
  };
  project: { id: string; name: string } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
  }>;
}

interface ChatPageProps {
  session: ChatSession;
}

const PANEL_SIZES_KEY = "chat-panel-sizes";

export function ChatPage({ session }: ChatPageProps) {
  const error = useChatStore((s) => s.error);
  const panelOpen = useChatStore((s) => s.panelOpen);

  // Imperative handle for the artifacts panel — used for ] shortcut collapse/expand
  const artifactsPanelRef = useRef<PanelImperativeHandle | null>(null);

  // localStorage size persistence (hydration-safe: load after mount)
  const [defaultSizes, setDefaultSizes] = useState<{ chat: number; artifacts: number }>({
    chat: 60,
    artifacts: 40,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PANEL_SIZES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.chat === "number" && typeof parsed.artifacts === "number") {
          setDefaultSizes(parsed);
        }
      }
    } catch {
      // ignore malformed storage or unavailable localStorage
    }
  }, []);

  // Sync store panelOpen state to the visual panel via imperative ref
  useEffect(() => {
    const panel = artifactsPanelRef.current;
    if (!panel) return;
    if (panelOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!panelOpen && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [panelOpen]);

  // Session initialization guard — don't reinit if same session
  useEffect(() => {
    const current = useChatStore.getState();
    if (current.sessionId === session.id) return;

    useChatStore.getState().initSession(
      session.id,
      session.agent.slug,
      session.agent.name,
      session.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
  }, [session.id]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Keyboard shortcuts — follows AppShell pattern exactly
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isEditable = document.activeElement?.getAttribute("contenteditable");
      if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "]":
          e.preventDefault();
          useChatStore.getState().togglePanel();
          break;
        case "j":
          e.preventDefault();
          // Phase 13: navigate to next deliverable
          break;
        case "k":
          e.preventDefault();
          // Phase 13: navigate to previous deliverable
          break;
        case "a":
          e.preventDefault();
          // Phase 13: approve active deliverable
          break;
        case "r":
          e.preventDefault();
          // Phase 16: open revision panel
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full"
      onLayoutChanged={(layout) => {
        // layout is { [panelId]: number } — use stable panel ids "chat" and "artifacts"
        try {
          localStorage.setItem(
            PANEL_SIZES_KEY,
            JSON.stringify({ chat: layout["chat"] ?? 60, artifacts: layout["artifacts"] ?? 40 })
          );
        } catch {
          // ignore storage failures
        }
      }}
    >
      <ResizablePanel
        id="chat"
        defaultSize={defaultSizes.chat}
        minSize={35}
      >
        <div className="flex h-full flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{session.agent.name}</h1>
              <Badge variant="secondary" className="rounded-lg">{session.agent.division}</Badge>
              <ProjectSelector sessionId={session.id} initialProject={session.project} />
            </div>
            <ModelSelector />
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <MessageList />
          </div>

          {/* Input */}
          <ChatInput />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        id="artifacts"
        panelRef={artifactsPanelRef}
        defaultSize={defaultSizes.artifacts}
        minSize={0}
        collapsible
        collapsedSize={0}
        onResize={(panelSize) => {
          // Sync store when panel is resized to collapsed (0%) or expanded
          if (panelSize.asPercentage === 0) {
            useChatStore.getState().closePanel();
          } else {
            useChatStore.getState().openPanel();
          }
        }}
      >
        <ArtifactsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
