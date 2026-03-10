import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { settingsService } from "@/lib/services/settings";
import { orchestrationService } from "@/lib/services/orchestration";
import { chatService } from "@/lib/services/chat";
import { deliverableInstruction } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const { missionId } = await params;

    const mission = await orchestrationService.getMission(missionId);
    if (!mission) {
      return Response.json({ error: "Mission not found" }, { status: 404 });
    }

    const apiKey = await settingsService.getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "API key not configured" },
        { status: 401 }
      );
    }

    const client = new Anthropic({ apiKey });

    await orchestrationService.updateMissionStatus(mission.id, "streaming");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let closed = false;
        let activeStreams = mission.lanes.length;

        // Track stream instances for abort cleanup
        const anthropicStreams: ReturnType<typeof client.messages.stream>[] = [];

        function safeEnqueue(data: string) {
          if (!closed) {
            controller.enqueue(encoder.encode(data));
          }
        }

        function safeClose() {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }

        function send(data: object) {
          safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
        }

        function onStreamComplete() {
          activeStreams--;
          if (activeStreams <= 0) {
            send({ type: "mission_done" });
            orchestrationService
              .updateMissionStatus(mission.id, "done")
              .catch(() => {});
            safeClose();
          }
        }

        // Handle client abort
        request.signal.addEventListener("abort", () => {
          for (const s of anthropicStreams) {
            try {
              s.abort();
            } catch {
              // Stream may already be closed
            }
          }
          safeClose();
        });

        // Build team context so each agent knows who else is on the mission
        const teamRoster = mission.lanes
          .map((l) => `- ${l.agent.name} (${l.agent.division})`)
          .join("\n");

        // Spawn parallel streams for each lane
        for (const lane of mission.lanes) {
          try {
            const otherAgents = mission.lanes
              .filter((l) => l.agentId !== lane.agentId)
              .map((l) => l.agent.name)
              .join(", ");

            const missionContext = `

## Mission Context
You are part of a collaborative mission team working together on a client brief. Each agent handles their area of expertise to produce a coordinated result.

**Team members on this mission:**
${teamRoster}

**Your role:** Focus on your area of expertise (${lane.agent.division}). The other agents (${otherAgents}) are handling their respective areas in parallel. Produce your specific deliverable — do NOT try to cover other agents' domains.

**Important:** This is a mission brief, not a conversation. Produce your complete deliverable immediately. Do NOT ask clarifying questions. Work with what you have and make reasonable assumptions.`;

            const anthropicStream = client.messages.stream({
              model: mission.model,
              max_tokens: 4096,
              system: lane.agent.systemPrompt + missionContext + deliverableInstruction,
              messages: [{ role: "user", content: mission.brief }],
            });

            anthropicStreams.push(anthropicStream);

            orchestrationService
              .updateLaneStatus(lane.id, "streaming")
              .catch(() => {});

            let fullResponse = "";

            anthropicStream.on("text", (text) => {
              fullResponse += text;
              send({ type: "text", agentId: lane.agentId, text });
            });

            anthropicStream.on("end", async () => {
              try {
                const finalMessage = await anthropicStream.finalMessage();
                const usage = {
                  input_tokens: finalMessage.usage.input_tokens,
                  output_tokens: finalMessage.usage.output_tokens,
                };

                // Persist messages
                await chatService.addMessage(
                  lane.sessionId,
                  "user",
                  mission.brief
                );
                const assistantMsg = await chatService.addMessage(
                  lane.sessionId,
                  "assistant",
                  fullResponse,
                  {
                    input: usage.input_tokens,
                    output: usage.output_tokens,
                  }
                );

                send({ type: "agent_done", agentId: lane.agentId, usage, messageId: assistantMsg.id });

                await orchestrationService.updateLaneStatus(lane.id, "done");
              } catch {
                // Persistence errors should not break stream
              }

              onStreamComplete();
            });

            anthropicStream.on("error", (error) => {
              send({
                type: "error",
                agentId: lane.agentId,
                message:
                  error instanceof Error ? error.message : "Stream error",
              });
              orchestrationService
                .updateLaneStatus(lane.id, "error")
                .catch(() => {});
              onStreamComplete();
            });
          } catch (error) {
            send({
              type: "error",
              agentId: lane.agentId,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to start stream",
            });
            onStreamComplete();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
