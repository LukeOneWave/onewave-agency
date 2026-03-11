import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { taskService } from "@/lib/services/task";
import { CreateTaskSchema } from "@/lib/validations/task";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignedAgent: {
          select: { id: true, name: true, color: true, slug: true },
        },
      },
      orderBy: [{ status: "asc" }, { order: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/projects/[id]/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const task = await taskService.create({ projectId, ...parsed.data });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
