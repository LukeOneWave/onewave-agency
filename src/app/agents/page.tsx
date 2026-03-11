import { Suspense } from "react";
import Link from "next/link";
import { agentService } from "@/lib/services/agent";
import { Badge } from "@/components/ui/badge";
import { AgentGrid } from "@/components/agents/AgentGrid";
import { DivisionTabs } from "@/components/agents/DivisionTabs";
import { AgentSearch } from "@/components/agents/AgentSearch";
import { Plus } from "lucide-react";

export const metadata = {
  title: "Agent Catalog | OneWave",
  description: "Browse all AI agents across divisions",
};

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string; search?: string }>;
}) {
  const params = await searchParams;
  const division = params.division || undefined;
  const search = params.search || undefined;

  const [agents, divisions, count] = await Promise.all([
    agentService.getAll({ division, search }),
    agentService.getDivisions(),
    agentService.getCount(),
  ]);

  const cardData = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    description: a.description,
    division: a.division,
    color: a.color,
    isCustom: a.isCustom,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Agent Catalog</h1>
            <Badge variant="secondary">{count} agents</Badge>
          </div>
          <Link
            href="/agents/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        </div>
        <p className="mt-1 text-muted-foreground">
          Browse and explore AI agents across all divisions
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <DivisionTabs
            divisions={divisions}
            activeDivision={division || "all"}
          />
        </Suspense>
        <Suspense>
          <AgentSearch initialSearch={search || ""} />
        </Suspense>
      </div>

      <AgentGrid agents={cardData} />
    </div>
  );
}
