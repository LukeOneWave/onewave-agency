import { describe, it, expect } from "vitest";
import { parseDeliverables } from "../deliverable-parser";

describe("parseDeliverables", () => {
  it("returns single text segment with hasDeliverables false when no deliverables", () => {
    const result = parseDeliverables("no deliverable here");
    expect(result).toEqual({
      segments: [{ type: "text", content: "no deliverable here" }],
      hasDeliverables: false,
    });
  });

  it("returns 3 segments for text-deliverable-text pattern", () => {
    const result = parseDeliverables(
      "before <deliverable>content</deliverable> after"
    );
    expect(result.hasDeliverables).toBe(true);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({ type: "text", content: "before " });
    expect(result.segments[1]).toEqual({
      type: "deliverable",
      content: "content",
      index: 0,
    });
    expect(result.segments[2]).toEqual({ type: "text", content: " after" });
  });

  it("returns correct indices for multiple deliverable blocks", () => {
    const result = parseDeliverables(
      "<deliverable>first</deliverable> middle <deliverable>second</deliverable>"
    );
    expect(result.hasDeliverables).toBe(true);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({
      type: "deliverable",
      content: "first",
      index: 0,
    });
    expect(result.segments[1]).toEqual({ type: "text", content: " middle " });
    expect(result.segments[2]).toEqual({
      type: "deliverable",
      content: "second",
      index: 1,
    });
  });

  it("works with deliverable only and no surrounding text", () => {
    const result = parseDeliverables("<deliverable>only</deliverable>");
    expect(result.hasDeliverables).toBe(true);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toEqual({
      type: "deliverable",
      content: "only",
      index: 0,
    });
  });

  it("returns single empty text segment for empty string", () => {
    const result = parseDeliverables("");
    expect(result).toEqual({
      segments: [{ type: "text", content: "" }],
      hasDeliverables: false,
    });
  });
});
