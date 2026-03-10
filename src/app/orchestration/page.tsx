import { agentService } from "@/lib/services/agent";
import { MissionCreator } from "./MissionCreator";

export const metadata = {
  title: "New Mission | OneWave",
  description: "Launch a multi-agent mission",
};

export default async function OrchestrationPage() {
  const agents = await agentService.getAll();

  const agentData = agents.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    division: a.division,
    color: a.color,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Mission</h1>
        <p className="mt-1 text-muted-foreground">
          Select agents, write a brief, and launch a parallel mission across
          your team.
        </p>
      </div>
      <MissionCreator agents={agentData} />
    </div>
  );
}
