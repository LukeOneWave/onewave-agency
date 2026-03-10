"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/store/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";

interface ChatSession {
  id: string;
  agent: {
    slug: string;
    name: string;
    division: string;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
  }>;
}

interface ChatPageProps {
  session: ChatSession;
}

export function ChatPage({ session }: ChatPageProps) {
  const error = useChatStore((s) => s.error);

  useEffect(() => {
    // Only init if switching to a different session — don't wipe in-memory messages
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

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{session.agent.name}</h1>
          <Badge variant="secondary" className="rounded-lg">{session.agent.division}</Badge>
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
  );
}
