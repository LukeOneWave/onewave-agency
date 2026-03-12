"use client";

import { useState, useEffect } from "react";
import { FolderKanban, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  sessionId: string;
  initialProject: Project | null;
}

export function ProjectSelector({ sessionId, initialProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(initialProject);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.map((p: Project) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [open]);

  async function handleSelect(project: Project | null) {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project?.id || null }),
      });
      if (!res.ok) throw new Error();
      setSelected(project);
      setOpen(false);
      toast.success(project ? `Linked to ${project.name}` : "Unlinked from project");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
        {selected ? (
          <span className="max-w-[120px] truncate">{selected.name}</span>
        ) : (
          <span className="text-muted-foreground">Link to Project</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
            {selected && (
              <button
                onClick={() => handleSelect(null)}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                Unlink from project
              </button>
            )}
            {projects.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No projects yet</p>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              >
                {selected?.id === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
                <span className={selected?.id === p.id ? "font-medium" : ""}>{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
