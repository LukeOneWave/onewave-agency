import { describe, it } from "vitest";

// These tests will be activated once src/components/chat/MessageBubble.tsx is implemented.
// For now, they document the expected behavior of the MessageBubble component (CHAT-03).
//
// Tests use @testing-library/react for rendering and assertion.
// The component should render markdown for assistant messages using:
//   react-markdown + remark-gfm + rehype-highlight

describe("MessageBubble", () => {
  it.todo("renders user messages as plain text");

  it.todo("renders assistant messages with markdown formatting");

  it.todo("renders code blocks with syntax highlighting");

  it.todo("renders tables from GFM markdown");
});

/*
 * Implementation notes for when MessageBubble.tsx is created:
 *
 * import { render, screen } from "@testing-library/react";
 * import { MessageBubble } from "@/components/chat/MessageBubble";
 *
 * Test "renders user messages as plain text":
 *   render(<MessageBubble role="user" content="Hello there" />);
 *   expect(screen.getByText("Hello there")).toBeDefined();
 *   // User messages should NOT be rendered through markdown
 *
 * Test "renders assistant messages with markdown formatting":
 *   const { container } = render(<MessageBubble role="assistant" content="**bold**" />);
 *   expect(container.querySelector("strong")).not.toBeNull();
 *
 * Test "renders code blocks with syntax highlighting":
 *   const code = '```javascript\nconst x = 42;\n```';
 *   const { container } = render(<MessageBubble role="assistant" content={code} />);
 *   expect(container.querySelector("code.hljs")).not.toBeNull();
 *
 * Test "renders tables from GFM markdown":
 *   const table = "| H1 | H2 |\n|---|---|\n| A | B |";
 *   const { container } = render(<MessageBubble role="assistant" content={table} />);
 *   expect(container.querySelector("table")).not.toBeNull();
 */
