import type { Project, Task, Agent } from "../../generated/prisma";

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export type TaskWithAgent = Task & {
  assignedAgent?: Pick<Agent, "id" | "name" | "color" | "slug"> | null;
};

export type ProjectWithTasks = Project & {
  tasks: TaskWithAgent[];
  _count?: {
    tasks: number;
  };
};
