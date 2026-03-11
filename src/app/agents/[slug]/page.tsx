import { notFound } from "next/navigation";
import { agentService } from "@/lib/services/agent";
import { AgentDetail } from "@/components/agents/AgentDetail";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = await agentService.getBySlug(slug);
  if (!agent) return { title: "Agent Not Found" };
  return {
    title: `${agent.name} | OneWave`,
    description: agent.description,
  };
}

export const dynamicParams = true;

export default async function AgentDetailPage({ params }: Props) {
  const { slug } = await params;
  const agent = await agentService.getBySlug(slug);

  if (!agent) {
    notFound();
  }

  return <AgentDetail agent={agent} />;
}
