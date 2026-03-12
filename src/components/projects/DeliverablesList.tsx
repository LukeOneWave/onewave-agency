"use client";

import Link from "next/link";

interface DeliverableVersion {
  id: string;
  version: number;
  createdAt: string | Date;
}

interface DeliverableWithVersions {
  id: string;
  content: string | null;
  status: string;
  createdAt: string | Date;
  versions: DeliverableVersion[];
  message?: { sessionId: string };
}

interface DeliverablesListProps {
  deliverables: DeliverableWithVersions[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending:
      "bg-muted text-muted-foreground",
    approved:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    revised:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  const classes = variants[status] ?? variants["pending"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeliverablesList({ deliverables }: DeliverablesListProps) {
  if (deliverables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">
          No deliverables yet. Deliverables created from project conversations
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {deliverables.map((deliverable) => {
        const preview = deliverable.content
          ? deliverable.content.slice(0, 100) +
            (deliverable.content.length > 100 ? "…" : "")
          : "No content";

        const latestVersion =
          deliverable.versions.length > 0
            ? `v${deliverable.versions[deliverable.versions.length - 1].version}`
            : "No versions";

        const sessionId = deliverable.message?.sessionId;

        const card = (
          <div
            key={deliverable.id}
            className={`rounded-xl border border-foreground/10 bg-card p-4 flex flex-col gap-3 transition-all duration-200${sessionId ? " hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}
          >
            <p className="text-sm text-card-foreground leading-relaxed">
              {preview}
            </p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <StatusBadge status={deliverable.status} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                  {latestVersion}
                </span>
                <span>{formatDate(deliverable.createdAt)}</span>
              </div>
            </div>
          </div>
        );

        if (sessionId) {
          return (
            <Link key={deliverable.id} href={`/chat/${sessionId}`} className="no-underline">
              {card}
            </Link>
          );
        }

        return card;
      })}
    </div>
  );
}
