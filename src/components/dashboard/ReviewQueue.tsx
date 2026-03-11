import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PendingDeliverable } from "@/lib/services/dashboard";

interface ReviewQueueProps {
  items: PendingDeliverable[];
}

export function ReviewQueue({ items }: ReviewQueueProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Review Queue</CardTitle>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending deliverables
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/chat/${item.message.session.id}`}
                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: item.message.session.agent.color,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.message.session.agent.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.message.session.title || "Untitled session"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
