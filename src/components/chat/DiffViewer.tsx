"use client";

import { useState } from "react";
import { GitCompare } from "lucide-react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface DeliverableVersion {
  id: string;
  deliverableId: string;
  version: number;
  content: string;
  createdAt: string;
}

interface DiffViewerProps {
  deliverableId: string;
  currentContent: string;
}

export function DiffViewer({ deliverableId }: DiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<DeliverableVersion[]>([]);
  const [selectedOld, setSelectedOld] = useState(0);
  const [selectedNew, setSelectedNew] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (!open && versions.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/deliverables/${deliverableId}/versions`);
        if (res.ok) {
          const data: DeliverableVersion[] = await res.json();
          setVersions(data);
          if (data.length >= 2) {
            setSelectedOld(data.length - 2);
            setSelectedNew(data.length - 1);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    setOpen((prev) => !prev);
  }

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/versions`);
      if (res.ok) {
        const data: DeliverableVersion[] = await res.json();
        setVersions(data);
        if (data.length >= 2) {
          setSelectedOld(data.length - 2);
          setSelectedNew(data.length - 1);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={open ? () => setOpen(false) : handleToggle}
        disabled={loading}
      >
        <GitCompare className="h-4 w-4 mr-1" />
        {loading ? "Loading..." : open ? "Hide Versions" : "Compare Versions"}
      </Button>

      {open && (
        <div className="mt-3 rounded-lg border border-border overflow-hidden">
          {versions.length < 2 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No previous versions to compare. Edit the deliverable to create a
              new version.
              <button
                onClick={handleRefresh}
                className="ml-2 underline text-primary"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Old version:
                  </label>
                  <select
                    className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                    value={selectedOld}
                    onChange={(e) => setSelectedOld(Number(e.target.value))}
                  >
                    {versions.map((v, idx) => (
                      <option key={v.id} value={idx}>
                        Version {v.version}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    New version:
                  </label>
                  <select
                    className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                    value={selectedNew}
                    onChange={(e) => setSelectedNew(Number(e.target.value))}
                  >
                    {versions.map((v, idx) => (
                      <option key={v.id} value={idx}>
                        Version {v.version}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <ReactDiffViewer
                  oldValue={versions[selectedOld]?.content ?? ""}
                  newValue={versions[selectedNew]?.content ?? ""}
                  splitView={true}
                  compareMethod={DiffMethod.WORDS}
                  useDarkTheme={resolvedTheme === "dark"}
                  leftTitle={`Version ${versions[selectedOld]?.version ?? ""}`}
                  rightTitle={`Version ${versions[selectedNew]?.version ?? ""}`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
