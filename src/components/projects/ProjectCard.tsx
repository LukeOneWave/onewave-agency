import Link from "next/link";
import type { projectService } from "@/lib/services/project";

type Project = Awaited<ReturnType<typeof projectService.getAll>>[number];

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Extract unique agents from tasks (filter nulls, dedupe by id)
  const agentMap = new Map<string, { id: string; name: string; color: string | null }>();
  for (const task of project.tasks) {
    if (task.assignedAgent) {
      agentMap.set(task.assignedAgent.id, task.assignedAgent);
    }
  }
  const agents = Array.from(agentMap.values());
  const displayAgents = agents.slice(0, 5);
  const overflowCount = agents.length - displayAgents.length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
    >
      <div className="mb-2">
        <h3 className="font-semibold text-base">{project.name}</h3>
        {project.description && (
          <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{doneTasks}/{totalTasks} tasks done</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {displayAgents.length > 0 && (
        <div className="mt-3 flex items-center gap-1">
          {displayAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white shrink-0"
              style={{ backgroundColor: agent.color ?? "#6366f1" }}
              title={agent.name}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground shrink-0">
              +{overflowCount}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
