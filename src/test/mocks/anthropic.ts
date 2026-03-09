import { vi } from "vitest";

/**
 * Mock stream that simulates Anthropic SDK's messages.stream() response.
 * Supports .on("text"), .on("end"), and .on("error") event handlers.
 */
export function mockStream(textChunks: string[], options?: { error?: Error }) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const stream = {
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(cb);

      // Schedule event emission after all handlers are registered
      if (event === "text" && !options?.error) {
        queueMicrotask(() => {
          for (const chunk of textChunks) {
            handlers["text"]?.forEach((h) => h(chunk));
          }
          // Emit "end" after all text chunks
          queueMicrotask(() => {
            handlers["end"]?.forEach((h) => h());
          });
        });
      }

      if (event === "error" && options?.error) {
        queueMicrotask(() => {
          handlers["error"]?.forEach((h) => h(options.error));
        });
      }

      return stream; // Allow chaining
    },

    get currentMessage() {
      return {
        usage: { input_tokens: 10, output_tokens: 20 },
      };
    },
  };

  return stream;
}

/**
 * Creates a mock Anthropic client matching the shape of `new Anthropic()`.
 * The `messages.stream()` method is mocked and can be configured per-test.
 */
export function createMockAnthropicClient() {
  const streamFn = vi.fn();

  return {
    client: {
      messages: {
        stream: streamFn,
      },
    },
    streamFn,
  };
}

/**
 * Returns a mock module default export for use with `vi.mock("@anthropic-ai/sdk")`.
 * Usage:
 *   vi.mock("@anthropic-ai/sdk", () => mockAnthropicModule());
 */
export function mockAnthropicModule() {
  const { client, streamFn } = createMockAnthropicClient();

  return {
    default: vi.fn(() => client),
    __streamFn: streamFn,
  };
}
