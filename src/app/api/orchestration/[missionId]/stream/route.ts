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

        // Spawn parallel streams for each lane
        for (const lane of mission.lanes) {
          try {
            const anthropicStream = client.messages.stream({
              model: mission.model,
              max_tokens: 4096,
              system: lane.agent.systemPrompt + deliverableInstruction,
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

                send({ type: "agent_done", agentId: lane.agentId, usage });

                // Persist messages
                await chatService.addMessage(
                  lane.sessionId,
                  "user",
                  mission.brief
                );
                await chatService.addMessage(
                  lane.sessionId,
                  "assistant",
                  fullResponse,
                  {
                    input: usage.input_tokens,
                    output: usage.output_tokens,
                  }
                );

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
