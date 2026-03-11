import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/services/project";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await projectService.getById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await projectService.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
