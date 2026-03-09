"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatWithAgentButtonProps {
  agentId: string;
  agentName: string;
}

export function ChatWithAgentButton({
  agentId,
  agentName,
}: ChatWithAgentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const { sessionId } = await response.json();
      router.push(`/chat/${sessionId}`);
    } catch (error) {
      console.error("Failed to create chat session:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isLoading} size="lg">
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      Chat with {agentName}
    </Button>
  );
}
