import Link from "next/link";
import { Users, MessageSquare, Settings } from "lucide-react";
import { agentService } from "@/lib/services/agent";
import { chatService } from "@/lib/services/chat";

export default async function DashboardPage() {
  const agentCount = await agentService.getCount();
  const recentSessions = await chatService.getRecentSessions(5);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/agents"
          className="flex items-center gap-4 rounded-lg border p-6 hover:bg-accent transition-colors"
        >
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{agentCount}</p>
            <p className="text-sm text-muted-foreground">Agents</p>
          </div>
        </Link>
        <Link
          href="/chat"
          className="flex items-center gap-4 rounded-lg border p-6 hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{recentSessions.length}</p>
            <p className="text-sm text-muted-foreground">Chat Sessions</p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-4 rounded-lg border p-6 hover:bg-accent transition-colors"
        >
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Configure API key</p>
            <p className="text-sm text-muted-foreground">and preferences</p>
          </div>
        </Link>
      </div>

      {/* Recent chats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Chats</h2>
        {recentSessions.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p>No conversations yet.</p>
            <Link href="/agents" className="text-primary hover:underline">
              Browse agents to start chatting
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
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
    </div>
  );
}
