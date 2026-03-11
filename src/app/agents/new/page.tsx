import { agentService } from "@/lib/services/agent";
import { AgentForm } from "@/components/agents/AgentForm";
import type { Metadata } from "next";
import type { AgentFormData } from "@/types/agent";

export const metadata: Metadata = {
  title: "Create Agent | OneWave",
};

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ cloneFrom?: string }>;
}) {
  const params = await searchParams;

  const [divisions] = await Promise.all([agentService.getDivisions()]);

  let cloneData: AgentFormData | undefined;

  if (params.cloneFrom) {
    const cloned = await agentService.getForClone(params.cloneFrom);
    if (cloned) {
      cloneData = cloned;
    }
  }

  return (
    <AgentForm mode="create" divisions={divisions} cloneData={cloneData} />
  );
}
