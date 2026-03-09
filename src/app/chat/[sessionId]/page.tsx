import { notFound } from "next/navigation";
import { chatService } from "@/lib/services/chat";
import { ChatPage } from "@/components/chat/ChatPage";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await chatService.getSession(sessionId);
  if (!session) return { title: "Chat Not Found" };
  return {
    title: `Chat with ${session.agent.name} | OneWave`,
  };
}

export default async function ChatSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await chatService.getSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <ChatPage
      session={{
        id: session.id,
        agent: {
          slug: session.agent.slug,
          name: session.agent.name,
          division: session.agent.division,
        },
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      }}
    />
  );
}
