import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Agent } from "@/types/agent";
import { ArrowLeft } from "lucide-react";
import { ChatWithAgentButton } from "./ChatWithAgentButton";

export function AgentDetail({ agent }: { agent: Agent }) {
  const tools = agent.tools
    ? agent.tools.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/agents"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agent Catalog
      </Link>

      <div className="mb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <Badge variant="secondary" className="mt-1">
            {agent.division}
          </Badge>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          {agent.description}
        </p>
        <div className="mt-4">
          <ChatWithAgentButton agentId={agent.id} agentName={agent.name} />
        </div>
      </div>

      {tools.length > 0 && (
        <>
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Tools
            </h2>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <Badge key={tool} variant="outline">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
          <Separator className="my-6" />
        </>
      )}

      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
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
