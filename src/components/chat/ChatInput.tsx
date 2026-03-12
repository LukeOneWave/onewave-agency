"use client";

import { useRef, useEffect, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chat";
import type { ChatAttachment } from "@/types/chat";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve({ name: file.name, type: file.type, data: base64 });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ChatInput() {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isStreaming, sendMessage, stopStreaming } = useChatStore();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;
    setValue("");
    const files = [...attachments];
    setAttachments([]);
    sendMessage(trimmed || "Please review the attached file(s).", files.length > 0 ? files : undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: ChatAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        continue; // skip files over 10MB
      }
      if (!ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith("text/")) {
        continue; // skip unsupported types
      }
      try {
        const attachment = await fileToAttachment(file);
        newAttachments.push(attachment);
      } catch {
        // skip failed reads
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-card p-4">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs"
            >
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="rounded p-0.5 hover:bg-muted"
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={[...ACCEPTED_TYPES, ".docx", ".pptx"].join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          aria-label="Attach files"
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={stopStreaming}
            aria-label="Stop streaming"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() && attachments.length === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
