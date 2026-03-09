import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/lib/services/agent";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const division = searchParams.get("division") || undefined;
  const search = searchParams.get("search") || undefined;

  const agents = await agentService.getAll({ division, search });
  return NextResponse.json(agents);
}
