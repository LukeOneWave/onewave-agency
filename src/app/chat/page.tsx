import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { chatService } from "@/lib/services/chat";

export const metadata = {
  title: "Chat | OneWave",
};

export default async function ChatIndexPage() {
  const sessions = await chatService.getRecentSessions();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-card shadow-sm">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
          <p className="text-muted-foreground mb-4">
            Start a chat by visiting an agent&apos;s detail page and clicking
            &quot;Chat with Agent&quot;.
          </p>
          <Link
            href="/agents"
            className="text-primary font-medium hover:underline"
          >
            Browse Agents
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/chat/${session.id}`}
              className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div>
                <p className="font-medium">{session.agent.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session._count.messages} message{session._count.messages !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
