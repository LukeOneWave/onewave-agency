"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface AgentOption {
  id: string;
  name: string;
  description: string;
  division: string;
  color: string;
}

interface AgentSelectorProps {
  agents: AgentOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const MAX_AGENTS = 10;

export function AgentSelector({
  agents,
  selectedIds,
  onSelectionChange,
}: AgentSelectorProps) {
  function toggleAgent(agentId: string) {
    if (selectedIds.includes(agentId)) {
      onSelectionChange(selectedIds.filter((id) => id !== agentId));
    } else {
      if (selectedIds.length >= MAX_AGENTS) {
        toast.warning(`Maximum ${MAX_AGENTS} agents per mission`);
        return;
      }
      onSelectionChange([...selectedIds, agentId]);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Select Agents</h2>
        <span className="text-sm text-muted-foreground">
          {selectedIds.length} agent{selectedIds.length !== 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => {
          const isSelected = selectedIds.includes(agent.id);
          const colorClass =
            divisionColors[agent.division] ||
            "bg-gray-500/15 text-gray-700 dark:text-gray-400";

          return (
            <Card
              key={agent.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50 relative",
                isSelected && "ring-2 ring-primary border-primary"
              )}
              onClick={() => toggleAgent(agent.id)}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <CardTitle className="text-sm leading-tight">
                    {agent.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-xs ${colorClass}`}
                  >
                    {agent.division}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
