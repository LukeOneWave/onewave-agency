import { MessageSquare, Rocket, CheckCircle } from "lucide-react";

interface ActivityItem {
  type: "chat" | "mission" | "deliverable";
  description: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const iconMap = {
  chat: MessageSquare,
  mission: Rocket,
  deliverable: CheckCircle,
} as const;

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
      {activities.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No activity yet. Start chatting with agents to see activity here.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-3">
          {activities.map((item, i) => {
            const Icon = iconMap[item.type];
            return (
              <div
                key={`${item.timestamp}-${i}`}
                className="flex items-start gap-3"
              >
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRelativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
