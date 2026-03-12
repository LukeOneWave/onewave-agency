"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Users, FolderKanban, MessageSquare } from "lucide-react";

interface SearchResults {
  agents: Array<{ id: string; name: string; slug: string; division: string }>;
  projects: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; title: string | null; agentName: string }>;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleValueChange(q: string) {
    setQuery(q);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResults = await res.json();
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setQuery("");
      setResults(null);
      setLoading(false);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    }
    onOpenChange(isOpen);
  }

  function navigate(url: string) {
    router.push(url);
    onOpenChange(false);
    setQuery("");
    setResults(null);
  }

  const hasAgents = (results?.agents?.length ?? 0) > 0;
  const hasProjects = (results?.projects?.length ?? 0) > 0;
  const hasSessions = (results?.sessions?.length ?? 0) > 0;
  const hasResults = hasAgents || hasProjects || hasSessions;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      label="Global search"
      className="fixed inset-0 z-50"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={() => handleOpenChange(false)}
      />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <Command.Input
          value={query}
          onValueChange={handleValueChange}
          placeholder="Search agents, projects, sessions..."
          className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 w-full outline-none bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <Command.Loading>
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                Searching...
              </div>
            </Command.Loading>
          )}

          {!loading && query.trim() && !hasResults && (
            <Command.Empty>
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                No results found.
              </div>
            </Command.Empty>
          )}

          {hasAgents && (
            <Command.Group
              heading="Agents"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {results!.agents.map((agent) => (
                <Command.Item
                  key={agent.id}
                  value={`agent-${agent.id}`}
                  onSelect={() => navigate(`/agents/${agent.slug}`)}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-sm data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <Users className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="flex-1 text-zinc-900 dark:text-zinc-100">{agent.name}</span>
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {agent.division}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {hasProjects && (
            <Command.Group
              heading="Projects"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {results!.projects.map((project) => (
                <Command.Item
                  key={project.id}
                  value={`project-${project.id}`}
                  onSelect={() => navigate(`/projects/${project.id}`)}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-sm data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <FolderKanban className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="flex-1 text-zinc-900 dark:text-zinc-100">{project.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {hasSessions && (
            <Command.Group
              heading="Sessions"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {results!.sessions.map((session) => (
                <Command.Item
                  key={session.id}
                  value={`session-${session.id}`}
                  onSelect={() => navigate(`/chat/${session.id}`)}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-sm data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <MessageSquare className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="flex-1 text-zinc-900 dark:text-zinc-100">
                    {session.title ?? "Untitled session"}
                  </span>
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {session.agentName}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
