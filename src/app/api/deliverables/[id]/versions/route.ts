import { NextRequest } from "next/server";
import { deliverableService } from "@/lib/services/deliverable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await deliverableService.getVersions(id);
    return Response.json(versions);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content || typeof content !== "string" || content.trim() === "") {
      return Response.json(
        { error: "content is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const version = await deliverableService.createVersion(id, content);
    return Response.json(version, { status: 201 });
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
