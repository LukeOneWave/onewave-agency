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
  engineering: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  design: "bg-pink-400/15 text-pink-600 dark:text-pink-400",
  product: "bg-violet-400/15 text-violet-600 dark:text-violet-400",
  marketing: "bg-amber-400/15 text-amber-700 dark:text-amber-400",
  sales: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400",
  support: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400",
  operations: "bg-teal-400/15 text-teal-700 dark:text-teal-400",
  finance: "bg-lime-400/15 text-lime-700 dark:text-lime-400",
  hr: "bg-rose-400/15 text-rose-600 dark:text-rose-400",
  legal: "bg-slate-400/15 text-slate-600 dark:text-slate-400",
};

export function AgentCard({ agent }: { agent: AgentCardData }) {
  const colorClass =
    divisionColors[agent.division] ||
    "bg-gray-400/15 text-gray-600 dark:text-gray-400";

  return (
    <Link href={`/agents/${agent.slug}`}>
      <Card className="h-full rounded-2xl shadow-sm border-0 bg-card transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {agent.name}
            </CardTitle>
            <Badge variant="secondary" className={`shrink-0 text-xs rounded-lg ${colorClass}`}>
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
