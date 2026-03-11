import { NextRequest } from "next/server";
import { deliverableService } from "@/lib/services/deliverable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deliverables = await deliverableService.getByProjectId(id);
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
