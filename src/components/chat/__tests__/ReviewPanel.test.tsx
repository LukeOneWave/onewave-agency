import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewPanel } from "../ReviewPanel";

function renderPanel(overrides: Partial<Parameters<typeof ReviewPanel>[0]> = {}) {
  const defaults = {
    messageId: "msg-1",
    deliverableIndex: 0,
    status: "pending" as const,
    onApprove: vi.fn(),
    onRequestRevision: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  render(<ReviewPanel {...props} />);
  return props;
}

describe("ReviewPanel", () => {
  it("renders approve and revise buttons for pending deliverable", () => {
    renderPanel();
    expect(screen.getByText("Approve")).toBeDefined();
    expect(screen.getByText("Request Revision")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("approve button calls onApprove", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByText("Approve"));
    expect(props.onApprove).toHaveBeenCalledOnce();
  });

  it("clicking revise shows textarea", () => {
    renderPanel();
    fireEvent.click(screen.getByText("Request Revision"));
    expect(screen.getByPlaceholderText("Describe what changes you'd like...")).toBeDefined();
    expect(screen.getByText("Send Feedback")).toBeDefined();
  });

  it("submitting feedback calls onRequestRevision with text", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByText("Request Revision"));
    const textarea = screen.getByPlaceholderText("Describe what changes you'd like...");
    fireEvent.change(textarea, { target: { value: "Please fix the intro" } });
    fireEvent.click(screen.getByText("Send Feedback"));
    expect(props.onRequestRevision).toHaveBeenCalledWith("Please fix the intro");
  });

  it("buttons disabled when status is approved", () => {
    renderPanel({ status: "approved" });
    const approveBtn = screen.getByText("Approve").closest("button");
    const reviseBtn = screen.getByText("Request Revision").closest("button");
    expect(approveBtn?.disabled).toBe(true);
    expect(reviseBtn?.disabled).toBe(true);
    expect(screen.getByText("Approved")).toBeDefined();
  });
});
