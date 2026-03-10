export type OrchSSEEvent =
  | { type: "text"; agentId: string; text: string }
  | { type: "agent_done"; agentId: string; usage: { input_tokens: number; output_tokens: number }; messageId?: string }
  | { type: "error"; agentId: string; message: string }
  | { type: "mission_done" };

export type MissionStatus = "pending" | "streaming" | "done";
export type LaneStatus = "pending" | "streaming" | "done" | "error";

export interface LaneState {
  agentId: string;
  agentName: string;
  division: string;
  color: string;
  sessionId: string;
  content: string;
  status: LaneStatus;
  error?: string;
  messageId?: string;
}

export interface MissionSummary {
  id: string;
  brief: string;
  model: string;
  status: MissionStatus;
  lanes: Array<{
    agentId: string;
    agentName: string;
    division: string;
    color: string;
    sessionId: string;
    status: string;
  }>;
  createdAt: string;
}
