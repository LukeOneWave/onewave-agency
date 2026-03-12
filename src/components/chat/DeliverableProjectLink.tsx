"use client";

import { useState, useEffect } from "react";
import { FolderKanban, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface DeliverableProjectLinkProps {
  deliverableId: string;
  messageId: string;
  currentProjectId?: string | null;
}

export function DeliverableProjectLink({
  deliverableId,
  messageId,
  currentProjectId,
}: DeliverableProjectLinkProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentProjectId ?? null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.map((p: Project) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [open]);

  const selectedName = projects.find((p) => p.id === selectedId)?.name;

  async function handleSelect(projectId: string | null) {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliverables/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId, projectId }),
      });
      if (!res.ok) throw new Error();
      setSelectedId(projectId);
      setOpen(false);
      const name = projects.find((p) => p.id === projectId)?.name;
      toast.success(projectId ? `Added to ${name}` : "Removed from project");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={selectedId ? `In project: ${selectedName}` : "Add to project"}
      >
        <FolderKanban className="h-3 w-3" />
        {selectedId ? (
          <span className="max-w-[100px] truncate">{selectedName || "Project"}</span>
        ) : (
          <span>Add to Project</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
            {selectedId && (
              <button
                onClick={() => handleSelect(null)}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                Remove from project
              </button>
            )}
            {projects.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No projects</p>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              >
                {selectedId === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
                <span className={selectedId === p.id ? "font-medium" : ""}>{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
