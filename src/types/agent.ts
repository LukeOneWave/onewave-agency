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
  "slug" | "name" | "description" | "division" | "color"
>;
