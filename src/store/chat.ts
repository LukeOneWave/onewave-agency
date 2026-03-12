import { create } from "zustand";
import type { ChatMessage, ChatAttachment, SSEEvent, DeliverableState } from "@/types/chat";

interface ChatMessageUI {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  sessionId: string | null;
  agentSlug: string | null;
  agentName: string | null;
  messages: ChatMessageUI[];
  isStreaming: boolean;
  selectedModel: string;
  error: string | null;
  _abortController: AbortController | null;
  deliverables: Record<string, DeliverableState>;

  initSession: (
    sessionId: string,
    agentSlug: string,
    agentName: string,
    existingMessages?: ChatMessageUI[]
  ) => void;
  setModel: (model: string) => void;
  sendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<void>;
  clearChat: () => void;
  stopStreaming: () => void;
  approveDeliverable: (messageId: string, deliverableIndex: number) => Promise<void>;
  requestRevision: (messageId: string, deliverableIndex: number, feedback: string) => Promise<void>;
  loadDeliverables: (messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessionId: null,
  agentSlug: null,
  agentName: null,
  messages: [],
  isStreaming: false,
  selectedModel: "claude-sonnet-4-6",
  error: null,
  _abortController: null,
  deliverables: {},

  initSession: (sessionId, agentSlug, agentName, existingMessages) => {
    set({
      sessionId,
      agentSlug,
      agentName,
      messages: existingMessages ?? [],
      error: null,
      deliverables: {},
    });

    // Lazily load deliverable statuses for existing assistant messages
    if (existingMessages) {
      for (const msg of existingMessages) {
        if (msg.role === "assistant" && msg.id) {
          get().loadDeliverables(msg.id);
        }
      }
    }
  },

  setModel: (model) => {
    set({ selectedModel: model });
  },

  sendMessage: async (content, attachments) => {
    const state = get();
    const abortController = new AbortController();

    // Show attachment names in the user message display
    const displayContent = attachments?.length
      ? `${content}\n\n📎 ${attachments.map((a) => a.name).join(", ")}`
      : content;

    // Add user message and empty assistant placeholder
    const userMessage: ChatMessageUI = { id: crypto.randomUUID(), role: "user", content: displayContent };
    const assistantMessage: ChatMessageUI = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const updatedMessages = [...state.messages, userMessage, assistantMessage];

    set({
      isStreaming: true,
      error: null,
      messages: updatedMessages,
      _abortController: abortController,
    });

    // Build messages array for API (as ChatMessage[])
    const apiMessages: ChatMessage[] = updatedMessages
      .filter((m) => m.content.length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    // Attach files to the last user message
    if (attachments?.length && apiMessages.length > 0) {
      const lastUserIdx = apiMessages.findLastIndex((m) => m.role === "user");
      if (lastUserIdx >= 0) {
        apiMessages[lastUserIdx] = { ...apiMessages[lastUserIdx], attachments };
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          agentSlug: state.agentSlug,
          messages: apiMessages,
          model: state.selectedModel,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error ?? `Request failed with status ${response.status}`;
        set({ error: errorMessage, isStreaming: false, _abortController: null });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        set({
          error: "No response body",
          isStreaming: false,
          _abortController: null,
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Extract complete SSE data segments
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? ""; // Keep incomplete segment in buffer

        for (const segment of segments) {
          const dataLine = segment.trim();
          if (!dataLine.startsWith("data: ")) continue;

          try {
            const event: SSEEvent = JSON.parse(dataLine.slice(6));

            if (event.type === "text") {
              set((s) => {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                if (last && last.role === "assistant") {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + event.text,
                  };
                }
                return { messages: msgs };
              });
            } else if (event.type === "done") {
              // Replace client UUID with real DB messageId
              if (event.messageId) {
                set((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last && last.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, id: event.messageId };
                  }
                  return { messages: msgs, isStreaming: false, _abortController: null };
                });
              } else {
                set({ isStreaming: false, _abortController: null });
              }
            } else if (event.type === "error") {
              set({
                error: event.message,
                isStreaming: false,
                _abortController: null,
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Ensure streaming is stopped if loop exits without done event
      if (get().isStreaming) {
        set({ isStreaming: false, _abortController: null });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User intentionally stopped streaming
        return;
      }
      set({
        error: error instanceof Error ? error.message : "Failed to send message",
        isStreaming: false,
        _abortController: null,
      });
    }
  },

  clearChat: () => {
    const state = get();
    state._abortController?.abort();
    set({
      sessionId: null,
      agentSlug: null,
      agentName: null,
      messages: [],
      isStreaming: false,
      selectedModel: "claude-sonnet-4-6",
      error: null,
      _abortController: null,
      deliverables: {},
    });
  },

  stopStreaming: () => {
    const state = get();
    state._abortController?.abort();
    set({ isStreaming: false, _abortController: null });
  },

  approveDeliverable: async (messageId, deliverableIndex) => {
    const key = `${messageId}-${deliverableIndex}`;
    const prev = get().deliverables[key];

    // Optimistic update
    set((s) => ({
      deliverables: {
        ...s.deliverables,
        [key]: { status: "approved" },
      },
    }));

    try {
      await fetch(`/api/deliverables/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: deliverableIndex, status: "approved" }),
      });
    } catch {
      // Revert on error
      set((s) => ({
        deliverables: {
          ...s.deliverables,
          [key]: prev ?? { status: "pending" },
        },
        error: "Failed to approve deliverable",
      }));
    }
  },

  requestRevision: async (messageId, deliverableIndex, feedback) => {
    const key = `${messageId}-${deliverableIndex}`;

    set((s) => ({
      deliverables: {
        ...s.deliverables,
        [key]: { status: "revised", feedback },
      },
    }));

    try {
      await fetch(`/api/deliverables/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          index: deliverableIndex,
          status: "revised",
          feedback,
        }),
      });
    } catch {
      // Status already set, API persist is best-effort
    }

    // Auto-send revision as next message
    const revisionPrompt = `Please revise the deliverable based on this feedback:\n\n${feedback}`;
    await get().sendMessage(revisionPrompt);
  },

  loadDeliverables: async (messageId) => {
    try {
      const res = await fetch(`/api/deliverables/${messageId}`);
      if (!res.ok) return;
      const records = await res.json();
      if (!Array.isArray(records) || records.length === 0) return;

      set((s) => {
        const updated = { ...s.deliverables };
        for (const record of records) {
          const key = `${messageId}-${record.index}`;
          updated[key] = {
            status: record.status,
            ...(record.feedback && { feedback: record.feedback }),
          };
        }
        return { deliverables: updated };
      });
    } catch {
      // Silently fail -- deliverables will show as pending
    }
  },
}));
