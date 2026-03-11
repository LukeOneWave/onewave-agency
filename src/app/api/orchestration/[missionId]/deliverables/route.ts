import { NextRequest } from "next/server";
import { orchestrationService } from "@/lib/services/orchestration";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const { missionId } = await params;
    const deliverables = await orchestrationService.getMissionDeliverables(missionId);
    return Response.json(deliverables);
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
