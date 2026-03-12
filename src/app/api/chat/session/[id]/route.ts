import { NextRequest } from "next/server";
import { chatService } from "@/lib/services/chat";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if ("projectId" in body) {
      const updated = await chatService.updateSessionProject(
        id,
        body.projectId || null
      );
      return Response.json(updated);
    }

    if ("title" in body) {
      const updated = await chatService.updateSessionTitle(id, body.title);
      return Response.json(updated);
    }

    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
