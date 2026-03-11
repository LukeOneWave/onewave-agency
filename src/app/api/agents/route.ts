import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/lib/services/agent";
import { CreateAgentSchema } from "@/lib/validations/agent";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const division = searchParams.get("division") || undefined;
  const search = searchParams.get("search") || undefined;

  const agents = await agentService.getAll({ division, search });
  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const agent = await agentService.create(parsed.data);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("POST /api/agents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
