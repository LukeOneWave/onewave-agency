"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InlineEditorProps {
  deliverableId: string | null;
  messageId: string;
  deliverableIndex: number;
  initialContent: string;
  onSaved: (newContent: string) => void;
}

export function InlineEditor({
  deliverableId,
  messageId,
  deliverableIndex,
  initialContent,
  onSaved,
}: InlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  function handleEditClick() {
    setDraft(content);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(content);
    setEditing(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    try {
      let recordId = deliverableId;

      if (recordId) {
        // PATCH to update existing Deliverable.content
        const patchRes = await fetch(`/api/deliverables/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliverableId: recordId, content: draft }),
        });
        if (!patchRes.ok) throw new Error("Failed to update deliverable");
      } else {
        // Upsert via status endpoint to create the record first
        const upsertRes = await fetch(`/api/deliverables/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: deliverableIndex, status: "pending" }),
        });
        if (!upsertRes.ok) throw new Error("Failed to create deliverable record");
        const record = await upsertRes.json();
        recordId = record.id;

        // Now update content
        const patchRes = await fetch(`/api/deliverables/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliverableId: recordId, content: draft }),
        });
        if (!patchRes.ok) throw new Error("Failed to update deliverable");
      }

      // POST to create a version snapshot
      const versionRes = await fetch(
        `/api/deliverables/${recordId}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft }),
        }
      );
      if (!versionRes.ok) throw new Error("Failed to create version");

      setContent(draft);
      onSaved(draft);
      setEditing(false);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          className="w-full font-mono text-sm resize-y"
          disabled={saving}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
      <button
        onClick={handleEditClick}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background border border-border shadow-sm hover:bg-muted"
        title="Edit deliverable"
        aria-label="Edit deliverable"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
