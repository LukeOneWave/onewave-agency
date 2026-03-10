"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat";
import { MessageBubble } from "./MessageBubble";

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Send a message to start the conversation
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id ?? index}
          role={message.role}
          content={message.content}
          messageId={message.id}
          isStreaming={isStreaming && index === messages.length - 1}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
