"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskStatus } from "@/types/project";
import type { TaskWithAgent } from "@/types/project";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: TaskWithAgent[];
}

export function KanbanColumn({ status, label, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  const taskIds = sortedTasks.map((t) => t.id);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[200px] space-y-2 rounded-lg p-2 transition-colors ${
            isOver ? "bg-muted/60" : "bg-muted/30"
          }`}
        >
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
