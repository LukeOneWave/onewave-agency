import type { CreateAgentSchema, UpdateAgentSchema } from "@/lib/validations/agent";
import type { z } from "zod/v4";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  division: string;
  description: string;
  color: string;
  tools: string | null;
  systemPrompt: string;
  rawMarkdown: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentCardData = Pick<
  Agent,
  "slug" | "name" | "description" | "division" | "color" | "isCustom"
>;

export type AgentCreateInput = z.infer<typeof CreateAgentSchema>;
export type AgentUpdateInput = z.infer<typeof UpdateAgentSchema>;

export interface AgentFormData {
  name: string;
  division: string;
  description: string;
  role: string;
  personality: string;
  process: string;
  color: string;
  tools?: string;
}
