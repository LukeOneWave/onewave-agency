import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/lib/services/agent";
import { UpdateAgentSchema } from "@/lib/validations/agent";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const agent = await agentService.update(id, parsed.data);
    return NextResponse.json(agent, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("seeded") || msg.includes("not custom") || msg.includes("cannot edit")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (msg.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("PATCH /api/agents/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await agentService.delete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("sessions") || msg.includes("session")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (msg.includes("seeded") || msg.includes("not custom") || msg.includes("cannot delete")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (msg.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("DELETE /api/agents/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
