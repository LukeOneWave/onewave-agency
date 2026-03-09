import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentCardData } from "@/types/agent";

const divisionColors: Record<string, string> = {
  engineering: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  design: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  product: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  marketing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  sales: "bg-green-500/15 text-green-700 dark:text-green-400",
  support: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  operations: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  finance: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  hr: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  legal: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export function AgentCard({ agent }: { agent: AgentCardData }) {
  const colorClass =
    divisionColors[agent.division] ||
    "bg-gray-500/15 text-gray-700 dark:text-gray-400";

  return (
    <Link href={`/agents/${agent.slug}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {agent.name}
            </CardTitle>
            <Badge variant="secondary" className={`shrink-0 text-xs ${colorClass}`}>
              {agent.division}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {agent.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
