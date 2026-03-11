"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TaskWithAgent } from "@/types/project";

interface TaskCardProps {
  task: TaskWithAgent;
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-lg border bg-card p-3 select-none"
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-0.5 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing focus:outline-none"
          aria-label="Drag handle"
          type="button"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug break-words">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {task.assignedAgent && (
          <div
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: task.assignedAgent.color ?? "#6366f1" }}
            title={task.assignedAgent.name}
          >
            {task.assignedAgent.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
