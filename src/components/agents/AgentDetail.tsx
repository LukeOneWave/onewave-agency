"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/agent";
import { ArrowLeft, Pencil, Copy, Trash2 } from "lucide-react";
import { ChatWithAgentButton } from "./ChatWithAgentButton";

export function AgentDetail({ agent }: { agent: Agent }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const tools = agent.tools
    ? agent.tools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this agent?"
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.status === 409) {
        toast.error(data.error ?? "Agent has existing sessions and cannot be deleted.");
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete agent.");
        return;
      }

      toast.success("Agent deleted");
      router.push("/agents");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/agents"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agent Catalog
      </Link>

      <div className="rounded-2xl bg-card p-6 shadow-sm mb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <div className="flex items-center gap-1 mt-1">
            {agent.isCustom && (
              <Badge variant="outline" className="rounded-lg">
                Custom
              </Badge>
            )}
            <Badge variant="secondary" className="rounded-lg">
              {agent.division}
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">{agent.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ChatWithAgentButton agentId={agent.id} agentName={agent.name} />

          {/* Clone button - available for all agents */}
          <Link
            href={`/agents/new?cloneFrom=${agent.slug}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Copy className="h-4 w-4" />
            Clone
          </Link>

          {/* Edit and Delete - custom agents only */}
          {agent.isCustom && (
            <>
              <Link
                href={`/agents/${agent.slug}/edit`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}
        </div>
      </div>

      {tools.length > 0 && (
        <div className="rounded-2xl bg-card p-6 shadow-sm mb-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Tools
          </h2>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <Badge key={tool} variant="outline" className="rounded-lg">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          System Prompt
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {agent.systemPrompt}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
