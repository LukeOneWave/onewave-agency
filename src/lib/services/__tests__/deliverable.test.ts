import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    deliverableVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    deliverable: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { deliverableService } from "@/lib/services/deliverable";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

const mockDeliverableVersion = {
  id: "ver-1",
  deliverableId: "deliv-1",
  version: 1,
  content: "Version 1 content",
  createdAt: new Date(),
};

const mockDeliverable = {
  id: "deliv-1",
  messageId: "msg-1",
  index: 0,
  status: "pending",
  feedback: null,
  content: "Some content",
  projectId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  versions: [],
};

describe("deliverableService - getVersions", () => {
  it("returns versions ordered by version asc", async () => {
    const versions = [
      { ...mockDeliverableVersion, version: 1 },
      { ...mockDeliverableVersion, id: "ver-2", version: 2, content: "v2" },
    ];
    mockPrisma.deliverableVersion.findMany.mockResolvedValue(versions);

    const result = await deliverableService.getVersions("deliv-1");

    expect(mockPrisma.deliverableVersion.findMany).toHaveBeenCalledWith({
      where: { deliverableId: "deliv-1" },
      orderBy: { version: "asc" },
    });
    expect(result).toEqual(versions);
  });

  it("returns empty array when no versions exist", async () => {
    mockPrisma.deliverableVersion.findMany.mockResolvedValue([]);

    const result = await deliverableService.getVersions("deliv-999");

    expect(result).toEqual([]);
  });
});

describe("deliverableService - createVersion", () => {
  it("creates version with auto-incremented number starting at 1 when no prior versions", async () => {
    mockPrisma.deliverableVersion.findFirst.mockResolvedValue(null);
    const created = { ...mockDeliverableVersion, version: 1 };
    mockPrisma.deliverableVersion.create.mockResolvedValue(created);

    const result = await deliverableService.createVersion("deliv-1", "First content");

    expect(mockPrisma.deliverableVersion.findFirst).toHaveBeenCalledWith({
      where: { deliverableId: "deliv-1" },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    expect(mockPrisma.deliverableVersion.create).toHaveBeenCalledWith({
      data: {
        deliverableId: "deliv-1",
        version: 1,
        content: "First content",
      },
    });
    expect(result).toEqual(created);
  });

  it("creates version with max+1 when prior versions exist", async () => {
    mockPrisma.deliverableVersion.findFirst.mockResolvedValue({ version: 3 });
    const created = { ...mockDeliverableVersion, version: 4 };
    mockPrisma.deliverableVersion.create.mockResolvedValue(created);

    const result = await deliverableService.createVersion("deliv-1", "Fourth content");

    expect(mockPrisma.deliverableVersion.create).toHaveBeenCalledWith({
      data: {
        deliverableId: "deliv-1",
        version: 4,
        content: "Fourth content",
      },
    });
    expect(result).toEqual(created);
  });
});

describe("deliverableService - updateContent", () => {
  it("updates the content field and returns updated deliverable", async () => {
    const updated = { ...mockDeliverable, content: "Updated content" };
    mockPrisma.deliverable.update.mockResolvedValue(updated);

    const result = await deliverableService.updateContent("deliv-1", "Updated content");

    expect(mockPrisma.deliverable.update).toHaveBeenCalledWith({
      where: { id: "deliv-1" },
      data: { content: "Updated content" },
    });
    expect(result).toEqual(updated);
  });
});

describe("deliverableService - getByProjectId", () => {
  it("returns deliverables for projectId ordered by createdAt asc with versions", async () => {
    const deliverables = [
      { ...mockDeliverable, projectId: "proj-1", versions: [] },
      { ...mockDeliverable, id: "deliv-2", projectId: "proj-1", versions: [mockDeliverableVersion] },
    ];
    mockPrisma.deliverable.findMany.mockResolvedValue(deliverables);

    const result = await deliverableService.getByProjectId("proj-1");

    expect(mockPrisma.deliverable.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      include: { versions: { orderBy: { version: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    expect(result).toEqual(deliverables);
  });

  it("returns empty array when no deliverables match projectId", async () => {
    mockPrisma.deliverable.findMany.mockResolvedValue([]);

    const result = await deliverableService.getByProjectId("proj-unknown");

    expect(result).toEqual([]);
  });
});
