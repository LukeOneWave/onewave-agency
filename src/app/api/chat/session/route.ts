import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/services/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, model, projectId } = body;

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const session = await chatService.createSession(
      agentId,
      model || "claude-sonnet-4-6",
      projectId || undefined
    );

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
