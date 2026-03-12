import { NextRequest } from "next/server";
import { deliverableService } from "@/lib/services/deliverable";

const VALID_STATUSES = ["pending", "approved", "revised"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    // Project assignment path: { deliverableId, projectId }
    if ("deliverableId" in body && "projectId" in body) {
      const { deliverableId, projectId } = body as {
        deliverableId: string;
        projectId: string | null;
      };
      const updated = await deliverableService.assignProject(deliverableId, projectId);
      return Response.json(updated);
    }

    // Content update path: { deliverableId, content } (no status field)
    if ("deliverableId" in body && "content" in body && !("status" in body)) {
      const { deliverableId, content } = body as {
        deliverableId: string;
        content: string;
      };
      const updated = await deliverableService.updateContent(deliverableId, content);
      return Response.json(updated);
    }

    // Status update path: { index, status, feedback? }
    const { index, status, feedback } = body as {
      index: number;
      status: string;
      feedback?: string;
    };

    if (typeof index !== "number" || index < 0) {
      return Response.json(
        { error: "Invalid index: must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        { error: `Invalid status: must be one of ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const deliverable = await deliverableService.upsertStatus(
      messageId,
      index,
      status,
      feedback
    );

    return Response.json(deliverable);
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const deliverables = await deliverableService.getByMessageId(messageId);
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
