import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the agentService
vi.mock("@/lib/services/agent", () => ({
  agentService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the validation schemas
vi.mock("@/lib/validations/agent", () => ({
  CreateAgentSchema: {
    safeParse: vi.fn(),
  },
  UpdateAgentSchema: {
    safeParse: vi.fn(),
  },
}));

import { agentService } from "@/lib/services/agent";
import { CreateAgentSchema, UpdateAgentSchema } from "@/lib/validations/agent";
import { POST, GET } from "@/app/api/agents/route";
import { PATCH, DELETE } from "@/app/api/agents/[id]/route";

const mockAgent = {
  id: "agent-custom-1",
  name: "My Custom Agent",
  slug: "my-custom-agent",
  division: "engineering",
  description: "A custom agent",
  color: "#6366f1",
  tools: null,
  systemPrompt: "## Role\nTest",
  rawMarkdown: "---\n---\n## Role\nTest",
  isCustom: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/agents", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeIdRequest(body: unknown, id: string, method = "PATCH"): NextRequest {
  return new NextRequest(`http://localhost/api/agents/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/agents", () => {
  it("creates an agent with valid input and returns 201", async () => {
    const validInput = {
      name: "My Custom Agent",
      division: "engineering",
      description: "A custom agent",
      role: "Be helpful",
      personality: "Friendly",
      process: "Step by step",
    };

    vi.mocked(CreateAgentSchema.safeParse).mockReturnValue({
      success: true,
      data: validInput,
    } as never);
    vi.mocked(agentService.create).mockResolvedValue(mockAgent as never);

    const req = makeRequest(validInput);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ name: "My Custom Agent" });
  });

  it("returns 400 with validation errors when input is invalid", async () => {
    vi.mocked(CreateAgentSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ message: "Name is required" }] },
    } as never);

    const req = makeRequest({ division: "engineering" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 500 on unexpected service error", async () => {
    vi.mocked(CreateAgentSchema.safeParse).mockReturnValue({
      success: true,
      data: { name: "test" },
    } as never);
    vi.mocked(agentService.create).mockRejectedValue(new Error("DB error"));

    const req = makeRequest({ name: "test" });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/agents/[id]", () => {
  const params = Promise.resolve({ id: "agent-custom-1" });

  it("returns 200 with updated agent on valid update", async () => {
    const updateInput = { description: "Updated desc" };
    vi.mocked(UpdateAgentSchema.safeParse).mockReturnValue({
      success: true,
      data: updateInput,
    } as never);
    vi.mocked(agentService.update).mockResolvedValue({
      ...mockAgent,
      description: "Updated desc",
    } as never);

    const req = makeIdRequest(updateInput, "agent-custom-1");
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.description).toBe("Updated desc");
  });

  it("returns 400 when update input is invalid", async () => {
    vi.mocked(UpdateAgentSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ message: "Invalid field" }] },
    } as never);

    const req = makeIdRequest({}, "agent-custom-1");
    const res = await PATCH(req, { params });

    expect(res.status).toBe(400);
  });

  it("returns 403 when trying to update a seeded agent", async () => {
    vi.mocked(UpdateAgentSchema.safeParse).mockReturnValue({
      success: true,
      data: { description: "Updated" },
    } as never);
    vi.mocked(agentService.update).mockRejectedValue(new Error("Cannot edit seeded agent: agent-seeded-1"));

    const seededParams = Promise.resolve({ id: "agent-seeded-1" });
    const req = makeIdRequest({ description: "Updated" }, "agent-seeded-1");
    const res = await PATCH(req, { params: seededParams });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/agents/[id]", () => {
  const params = Promise.resolve({ id: "agent-custom-1" });

  it("returns 200 with { success: true } on successful delete", async () => {
    vi.mocked(agentService.delete).mockResolvedValue(mockAgent as never);

    const req = makeIdRequest(null, "agent-custom-1", "DELETE");
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });
  });

  it("returns 409 when agent has existing sessions", async () => {
    vi.mocked(agentService.delete).mockRejectedValue(
      new Error("Cannot delete agent with 3 existing sessions")
    );

    const req = makeIdRequest(null, "agent-custom-1", "DELETE");
    const res = await DELETE(req, { params });

    expect(res.status).toBe(409);
  });

  it("returns 403 when trying to delete a seeded agent", async () => {
    vi.mocked(agentService.delete).mockRejectedValue(
      new Error("Cannot delete seeded agent: agent-seeded-1")
    );

    const seededParams = Promise.resolve({ id: "agent-seeded-1" });
    const req = makeIdRequest(null, "agent-seeded-1", "DELETE");
    const res = await DELETE(req, { params: seededParams });

    expect(res.status).toBe(403);
  });
});
