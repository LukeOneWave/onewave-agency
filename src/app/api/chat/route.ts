import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { settingsService } from "@/lib/services/settings";
import { agentService } from "@/lib/services/agent";
import { chatService } from "@/lib/services/chat";
import { deliverableInstruction } from "@/lib/constants";
import { parseDeliverables } from "@/lib/deliverable-parser";
import { deliverableService } from "@/lib/services/deliverable";
import type { ChatMessage, ChatAttachment } from "@/types/chat";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

async function extractDocxText(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPptxText(base64: string): Promise<string> {
  // PPTX is a zip of XML files — extract text from slide XML
  const { Readable } = await import("stream");
  const { pipeline } = await import("stream/promises");
  const { createInflateRaw } = await import("zlib");

  // Minimal zip parser — read local file headers, extract slide*.xml text
  const buf = Buffer.from(base64, "base64");
  const texts: string[] = [];
  let offset = 0;

  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // not a local file header

    const compMethod = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.toString("utf8", offset + 30, offset + 30 + nameLen);
    const dataStart = offset + 30 + nameLen + extraLen;

    if (name.match(/ppt\/slides\/slide\d+\.xml$/)) {
      const raw = buf.subarray(dataStart, dataStart + compSize);
      let xml: string;
      if (compMethod === 0) {
        xml = raw.toString("utf8");
      } else {
        try {
          const chunks: Buffer[] = [];
          const inflate = createInflateRaw();
          const readable = Readable.from(raw);
          inflate.on("data", (chunk: Buffer) => chunks.push(chunk));
          await pipeline(readable, inflate);
          xml = Buffer.concat(chunks).toString("utf8");
        } catch {
          offset = dataStart + compSize;
          continue;
        }
      }
      // Extract text from <a:t> tags
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      if (matches) {
        texts.push(matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" "));
      }
    }
    offset = dataStart + compSize;
  }

  return texts.join("\n\n") || "[Could not extract text from PPTX]";
}

async function buildContentBlocks(text: string, attachments: ChatAttachment[]) {
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];

  for (const att of attachments) {
    if (att.type.startsWith("image/")) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: att.type as ImageMediaType,
          data: att.data,
        },
      });
    } else if (att.type === "application/pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: att.data,
        },
        title: att.name,
      });
    } else if (att.type === DOCX_MIME) {
      const extracted = await extractDocxText(att.data);
      blocks.push({
        type: "text",
        text: `[Document: ${att.name}]\n\n${extracted}`,
      });
    } else if (att.type === PPTX_MIME) {
      const extracted = await extractPptxText(att.data);
      blocks.push({
        type: "text",
        text: `[Presentation: ${att.name}]\n\n${extracted}`,
      });
    } else if (att.type.startsWith("text/") || att.type === "application/json") {
      const decoded = Buffer.from(att.data, "base64").toString("utf8");
      blocks.push({
        type: "text",
        text: `[File: ${att.name}]\n\n${decoded}`,
      });
    } else {
      blocks.push({
        type: "text",
        text: `[File: ${att.name}] (unsupported format)`,
      });
    }
  }

  // Add the user's text message last
  if (text) {
    blocks.push({ type: "text", text });
  }

  return blocks;
}

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
            max_tokens: 16384,
            system: agent.systemPrompt + deliverableInstruction,
            messages: await Promise.all(
              messages.map(async (m) => ({
                role: m.role,
                content: m.attachments?.length
                  ? await buildContentBlocks(m.content, m.attachments)
                  : m.content,
              }))
            ),
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

              // Persist messages before sending done event (need messageId)
              let messageId: string | undefined;
              if (sessionId && lastUserMessage) {
                await chatService.addMessage(
                  sessionId,
                  lastUserMessage.role,
                  lastUserMessage.content
                );
                const assistantMsg = await chatService.addMessage(
                  sessionId,
                  "assistant",
                  fullResponse,
                  {
                    input: usage.input_tokens,
                    output: usage.output_tokens,
                  }
                );
                messageId = assistantMsg.id;

                // Auto-create deliverable records for any deliverables in the response
                const parsed = parseDeliverables(fullResponse);
                if (parsed.hasDeliverables) {
                  for (const segment of parsed.segments) {
                    if (segment.type === "deliverable") {
                      const record = await deliverableService.upsertStatus(
                        assistantMsg.id,
                        segment.index,
                        "pending"
                      );
                      // Store the deliverable content
                      await deliverableService.updateContent(record.id, segment.content);
                    }
                  }
                }
              }

              const doneEvent = JSON.stringify({ type: "done", usage, messageId });
              safeEnqueue(`data: ${doneEvent}\n\n`);
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
