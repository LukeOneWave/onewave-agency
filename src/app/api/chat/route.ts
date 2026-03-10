import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { settingsService } from "@/lib/services/settings";
import { agentService } from "@/lib/services/agent";
import { chatService } from "@/lib/services/chat";
import type { ChatMessage } from "@/types/chat";

const deliverableInstruction = `

## Output Format
When you produce a final deliverable (a complete piece of work like a strategy document, code, copy, design brief, plan, or any actionable output), wrap it in <deliverable> tags:

<deliverable>
[Your complete deliverable here]
</deliverable>

Use <deliverable> tags ONLY for complete, reviewable outputs. Do NOT wrap conversational responses, questions, clarifications, or partial work in these tags.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      agentSlug,
      messages,
      model,
    }: {
      sessionId: string;
      agentSlug: string;
      messages: ChatMessage[];
      model: string;
    } = body;

    // Validate API key
    const apiKey = await settingsService.getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "API key not configured" },
        { status: 401 }
      );
    }

    // Look up agent
    const agent = await agentService.getBySlug(agentSlug);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Create Anthropic client
    let client: Anthropic;
    try {
      client = new Anthropic({ apiKey });
    } catch {
      return Response.json(
        { error: "Failed to initialize Anthropic client" },
        { status: 500 }
      );
    }

    // Get the last user message for persistence
    const lastUserMessage = messages[messages.length - 1];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        function safeClose() {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }

        function safeEnqueue(data: string) {
          if (!closed) {
            controller.enqueue(encoder.encode(data));
          }
        }

        try {
          const anthropicStream = client.messages.stream({
            model,
            max_tokens: 4096,
            system: agent.systemPrompt + deliverableInstruction,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          let fullResponse = "";

          anthropicStream.on("text", (text) => {
            fullResponse += text;
            const event = JSON.stringify({ type: "text", text });
            safeEnqueue(`data: ${event}\n\n`);
          });

          anthropicStream.on("end", async () => {
            try {
              const finalMessage = await anthropicStream.finalMessage();
              const usage = {
                input_tokens: finalMessage.usage.input_tokens,
                output_tokens: finalMessage.usage.output_tokens,
              };

              const doneEvent = JSON.stringify({ type: "done", usage });
              safeEnqueue(`data: ${doneEvent}\n\n`);

              // Persist messages
              if (sessionId && lastUserMessage) {
                await chatService.addMessage(
                  sessionId,
                  lastUserMessage.role,
                  lastUserMessage.content
                );
                await chatService.addMessage(
                  sessionId,
                  "assistant",
                  fullResponse,
                  {
                    input: usage.input_tokens,
                    output: usage.output_tokens,
                  }
                );
              }
            } catch {
              // Persistence errors should not break the stream
            }

            safeClose();
          });

          anthropicStream.on("error", (error) => {
            const errorEvent = JSON.stringify({
              type: "error",
              message:
                error instanceof Error ? error.message : "Stream error",
            });
            safeEnqueue(`data: ${errorEvent}\n\n`);
            safeClose();
          });
        } catch (error) {
          const errorEvent = JSON.stringify({
            type: "error",
            message:
              error instanceof Error ? error.message : "Failed to start stream",
          });
          safeEnqueue(`data: ${errorEvent}\n\n`);
          safeClose();
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
