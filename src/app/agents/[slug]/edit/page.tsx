import { notFound } from "next/navigation";
import { agentService } from "@/lib/services/agent";
import { AgentForm } from "@/components/agents/AgentForm";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = await agentService.getBySlug(slug);
  if (!agent) return { title: "Agent Not Found" };
  return {
    title: `Edit ${agent.name} | OneWave`,
  };
}

export default async function EditAgentPage({ params }: Props) {
  const { slug } = await params;
  const [agent, divisions] = await Promise.all([
    agentService.getBySlug(slug),
    agentService.getDivisions(),
  ]);

  if (!agent || !agent.isCustom) {
    notFound();
  }

  return <AgentForm mode="edit" agent={agent} divisions={divisions} />;
}
