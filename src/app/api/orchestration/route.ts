import { NextRequest } from "next/server";
import { settingsService } from "@/lib/services/settings";
import { orchestrationService } from "@/lib/services/orchestration";

export async function POST(request: NextRequest) {
  try {
    const apiKey = await settingsService.getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "API key not configured" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentIds, brief, model } = body;

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return Response.json(
        { error: "agentIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!brief || typeof brief !== "string" || brief.trim().length === 0) {
      return Response.json(
        { error: "brief must be a non-empty string" },
        { status: 400 }
      );
    }

    const mission = await orchestrationService.createMission(
      agentIds,
      brief.trim(),
      model
    );

    return Response.json({ missionId: mission.id }, { status: 201 });
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
