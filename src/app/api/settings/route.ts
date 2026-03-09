import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/lib/services/settings";

export async function GET() {
  try {
    const hasKey = await settingsService.hasApiKey();
    const maskedKey = await settingsService.getMaskedKey();
    return NextResponse.json({ hasKey, maskedKey });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Invalid API key format. Must start with sk-ant-" },
        { status: 400 }
      );
    }

    await settingsService.setApiKey(apiKey);
    const maskedKey = await settingsService.getMaskedKey();

    return NextResponse.json({ success: true, maskedKey });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const apiKey = await settingsService.getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "No API key configured" },
        { status: 400 }
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });

    return NextResponse.json({
      success: true,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await settingsService.deleteApiKey();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
