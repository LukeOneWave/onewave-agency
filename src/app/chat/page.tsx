import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { chatService } from "@/lib/services/chat";

export const metadata = {
  title: "Chat History | OneWave",
};

function getRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (sessionDate.getTime() === today.getTime()) return "Today";
  if (sessionDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString();
}

export default async function ChatIndexPage() {
  const sessions = await chatService.getRecentSessions();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chat History</h1>
        {sessions.length > 0 && (
          <p className="text-muted-foreground mt-1">
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

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
          {sessions.map((session, i) => {
            const preview = session.title
              ? session.title
              : session.messages[0]?.content
              ? session.messages[0].content.length > 100
                ? session.messages[0].content.slice(0, 100) + "..."
                : session.messages[0].content
              : null;

            return (
              <div
                key={session.id}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 fill-mode-both"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
              <Link
                href={`/chat/${session.id}`}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: session.agent.color }}
                    />
                    <span className="font-medium">{session.agent.name}</span>
                    {session.agent.isCustom && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        Custom
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs px-1.5 py-0 capitalize">
                      {session.agent.division}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {preview ?? (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {session._count.messages} msg{session._count.messages !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {getRelativeDate(session.updatedAt)}
                  </p>
                </div>
              </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
