import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("MessageBubble", () => {
  it("renders user messages as plain text", () => {
    render(<MessageBubble role="user" content="Hello there" />);
    expect(screen.getByText("Hello there")).toBeDefined();
  });

  it("renders assistant messages with markdown formatting", () => {
    const { container } = render(
      <MessageBubble role="assistant" content="**bold**" />
    );
    expect(container.querySelector("strong")).not.toBeNull();
  });

  it("renders code blocks with syntax highlighting", () => {
    const code = "```javascript\nconst x = 42;\n```";
    const { container } = render(
      <MessageBubble role="assistant" content={code} />
    );
    expect(container.querySelector("code.hljs")).not.toBeNull();
  });

  it("renders tables from GFM markdown", () => {
    const table = "| H1 | H2 |\n|---|---|\n| A | B |";
    const { container } = render(
      <MessageBubble role="assistant" content={table} />
    );
    expect(container.querySelector("table")).not.toBeNull();
  });
});
