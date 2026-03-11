"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TASK_STATUSES, COLUMN_LABELS, type TaskStatus, type TaskWithAgent } from "@/types/project";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";

interface Agent {
  id: string;
  name: string;
  color: string;
}

interface KanbanBoardProps {
  initialTasks: TaskWithAgent[];
  projectId: string;
  agents: Agent[];
}

export function KanbanBoard({ initialTasks, projectId, agents }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAgent[]>(initialTasks);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskWithAgent | null>(null);

  // Confirmed state ref for revert-on-error
  const confirmedRef = useRef<TaskWithAgent[]>(initialTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target column: either a task's column or a column directly
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus: TaskStatus = overTask
      ? (overTask.status as TaskStatus)
      : (overId as TaskStatus);

    if (!TASK_STATUSES.includes(targetStatus as TaskStatus)) return;

    if (activeTask.status !== targetStatus) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: targetStatus } : t
        )
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      // Revert to confirmed state if dropped outside
      setTasks(confirmedRef.current);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentTasks = tasks;
    const activeTask = currentTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target column
    const overTask = currentTasks.find((t) => t.id === overId);
    const targetStatus: TaskStatus = overTask
      ? (overTask.status as TaskStatus)
      : (overId as TaskStatus);

    if (!TASK_STATUSES.includes(targetStatus as TaskStatus)) return;

    // Get tasks in the destination column (already updated by onDragOver)
    const columnTasks = currentTasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.order - b.order);

    let reorderedColumnTasks: TaskWithAgent[];

    if (activeTask.status === targetStatus && overTask) {
      // Reorder within same column
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);
      reorderedColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
    } else {
      // Task already moved to new column by onDragOver
      // Find where to insert relative to overTask
      if (overTask && overTask.id !== activeId) {
        const overIndex = columnTasks.findIndex((t) => t.id === overId);
        const withoutActive = columnTasks.filter((t) => t.id !== activeId);
        withoutActive.splice(overIndex, 0, activeTask);
        reorderedColumnTasks = withoutActive;
      } else {
        reorderedColumnTasks = columnTasks;
      }
    }

    // Assign sequential order values
    const updatedColumnTasks = reorderedColumnTasks.map((t, index) => ({
      ...t,
      order: index,
    }));

    // Build final tasks array
    const updatedTasks = currentTasks.map((t) => {
      const updated = updatedColumnTasks.find((u) => u.id === t.id);
      return updated ?? t;
    });

    // Optimistic update
    setTasks(updatedTasks);

    // Find tasks that actually changed (status or order)
    const changedTasks = updatedTasks.filter((updated) => {
      const original = confirmedRef.current.find((c) => c.id === updated.id);
      return !original || original.status !== updated.status || original.order !== updated.order;
    });

    if (changedTasks.length === 0) return;

    // Persist via PATCH
    Promise.all(
      changedTasks.map((t) =>
        fetch(`/api/tasks/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: t.status, order: t.order }),
        })
      )
    )
      .then((responses) => {
        const hasError = responses.some((r) => !r.ok);
        if (hasError) {
          setTasks(confirmedRef.current);
          toast.error("Failed to save task order. Changes reverted.");
        } else {
          confirmedRef.current = updatedTasks;
        }
      })
      .catch(() => {
        setTasks(confirmedRef.current);
        toast.error("Failed to save task order. Changes reverted.");
      });
  }

  function handleTaskCreated(task: TaskWithAgent) {
    const updated = [...confirmedRef.current, task];
    setTasks(updated);
    confirmedRef.current = updated;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Board
        </h2>
        <button
          type="button"
          onClick={() => setShowTaskForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              tasks={tasks.filter((t) => t.status === status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {showTaskForm && (
        <TaskForm
          projectId={projectId}
          agents={agents}
          onCreated={handleTaskCreated}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
}
