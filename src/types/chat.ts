import type {
  ChatSession as PrismaChatSession,
  Message as PrismaMessage,
} from "../../generated/prisma/client";

// Re-export Prisma types
export type ChatSession = PrismaChatSession;
export type Message = PrismaMessage;

// API payload type
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Claude model definitions
export const CLAUDE_MODELS = [
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Fast and intelligent",
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "Most capable",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fastest and cheapest",
  },
] as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[number]["id"];

// Deliverable types
export type DeliverableStatus = "pending" | "approved" | "revised";

export interface DeliverableState {
  status: DeliverableStatus;
  feedback?: string;
}

export type ParsedSegment =
  | { type: "text"; content: string }
  | { type: "deliverable"; content: string; index: number };

export interface ParsedContent {
  segments: ParsedSegment[];
  hasDeliverables: boolean;
}

// SSE event types
export type SSEEvent =
  | { type: "text"; text: string }
  | { type: "done"; usage: { input_tokens: number; output_tokens: number }; messageId?: string }
  | { type: "error"; message: string };
