import { notFound } from "next/navigation";
import { projectService } from "@/lib/services/project";
import { agentService } from "@/lib/services/agent";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { COLUMN_LABELS, TASK_STATUSES } from "@/types/project";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const [project, agents] = await Promise.all([
    projectService.getById(id),
    agentService.getAll(),
  ]);

  if (!project) {
    notFound();
  }

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;

  const agentsForForm = agents.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
  }));

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      {/* Progress summary */}
      <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">
          {doneTasks} of {totalTasks} task{totalTasks !== 1 ? "s" : ""} done
        </span>
        <div className="flex items-center gap-2">
          {TASK_STATUSES.map((status) => {
            const count = project.tasks.filter((t) => t.status === status).length;
            return (
              <span key={status} className="text-xs">
                {COLUMN_LABELS[status]}: {count}
              </span>
            );
          })}
        </div>
      </div>

      <KanbanBoard
        initialTasks={project.tasks}
        projectId={project.id}
        agents={agentsForForm}
      />
    </div>
  );
}
