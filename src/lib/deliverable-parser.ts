import type { ParsedContent } from "@/types/chat";

/**
 * Parses message content to extract <deliverable> blocks.
 * Returns segments of text and deliverable content with stable indices.
 */
export function parseDeliverables(content: string): ParsedContent {
  // Match both closed and unclosed deliverable tags
  const regex = /<deliverable>([\s\S]*?)(<\/deliverable>|$)/g;
  const segments: ParsedContent["segments"] = [];
  let lastIndex = 0;
  let deliverableIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Text before deliverable
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    // The deliverable itself (trim trailing whitespace from unclosed tags)
    segments.push({
      type: "deliverable",
      content: match[1].trim(),
      index: deliverableIndex++,
    });
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last deliverable (or entire content if no deliverables)
  if (lastIndex < content.length || segments.length === 0) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { segments, hasDeliverables: deliverableIndex > 0 };
}
