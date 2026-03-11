import { NextRequest, NextResponse } from "next/server";
import { searchService } from "@/lib/services/search";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json({ agents: [], projects: [], sessions: [] });
    }

    const result = await searchService.query(q);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/search] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
