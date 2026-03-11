"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type DeliverableStatus = "pending" | "approved" | "revised";

const REVIEW_STATUSES = ["pending", "approved", "revised"] as const;

const COLUMN_LABELS: Record<DeliverableStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  revised: "Needs Revision",
};

interface Agent {
  name: string;
  color: string;
  division: string;
}

interface MissionLane {
  agent: Agent;
}

interface Session {
  missionLane: MissionLane | null;
}

interface Message {
  session: Session;
}

interface DeliverableVersion {
  id: string;
  version: number;
  createdAt: string;
}

interface Deliverable {
  id: string;
  messageId: string;
  index: number;
  content: string | null;
  status: string;
  createdAt: string;
  versions: DeliverableVersion[];
  message: Message;
}

// --- DeliverableCard ---

interface DeliverableCardProps {
  deliverable: Deliverable;
  isOverlay?: boolean;
}

function DeliverableCard({ deliverable, isOverlay }: DeliverableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deliverable.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.4 : 1,
  };

  const agent = deliverable.message?.session?.missionLane?.agent;
  const preview = deliverable.content
    ? deliverable.content.slice(0, 80) +
      (deliverable.content.length > 80 ? "…" : "")
    : "No content";

  const latestVersion =
    deliverable.versions.length > 0
      ? deliverable.versions[deliverable.versions.length - 1].version
      : null;

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
          <p className="text-xs text-card-foreground leading-relaxed break-words">
            {preview}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {agent && (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: agent.color ?? "#6366f1" }}
                />
                <span className="text-xs text-muted-foreground font-medium">
                  {agent.name}
                </span>
              </div>
            )}
            {latestVersion !== null && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                v{latestVersion}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ReviewColumn ---

interface ReviewColumnProps {
  status: DeliverableStatus;
  label: string;
  deliverables: Deliverable[];
}

function ReviewColumn({ status, label, deliverables }: ReviewColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const ids = deliverables.map((d) => d.id);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {deliverables.length}
        </span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[200px] space-y-2 rounded-lg p-2 transition-colors ${
            isOver ? "bg-muted/60" : "bg-muted/30"
          }`}
        >
          {deliverables.map((d) => (
            <DeliverableCard key={d.id} deliverable={d} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// --- ReviewBoard ---

interface ReviewBoardProps {
  missionId: string;
}

export function ReviewBoard({ missionId }: ReviewBoardProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null);

  const confirmedRef = useRef<Deliverable[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orchestration/${missionId}/deliverables`)
      .then((r) => r.json())
      .then((data: Deliverable[]) => {
        setDeliverables(data);
        confirmedRef.current = data;
      })
      .catch(() => {
        toast.error("Failed to load deliverables");
      })
      .finally(() => setLoading(false));
  }, [missionId]);

  function handleDragStart(event: DragStartEvent) {
    const d = deliverables.find((x) => x.id === event.active.id);
    setActiveDeliverable(d ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeliverable(null);

    if (!over) {
      setDeliverables(confirmedRef.current);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const current = deliverables;
    const activeItem = current.find((d) => d.id === activeId);
    if (!activeItem) return;

    // Determine target column — either dropped on a column id or another card
    const overItem = current.find((d) => d.id === overId);
    const targetStatus: DeliverableStatus = overItem
      ? (overItem.status as DeliverableStatus)
      : (overId as DeliverableStatus);

    if (!REVIEW_STATUSES.includes(targetStatus)) return;

    if (activeItem.status === targetStatus) return;

    // Optimistic update
    const updated = current.map((d) =>
      d.id === activeId ? { ...d, status: targetStatus } : d
    );
    setDeliverables(updated);

    // Persist via PATCH /api/deliverables/[messageId]
    fetch(`/api/deliverables/${activeItem.messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: activeItem.index, status: targetStatus }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update status");
        confirmedRef.current = updated;
      })
      .catch(() => {
        setDeliverables(confirmedRef.current);
        toast.error("Failed to update status");
      });
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REVIEW_STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-24" />
            <div className="min-h-[200px] rounded-lg bg-muted/30 p-2 space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const byStatus = (status: DeliverableStatus) =>
    deliverables.filter((d) => d.status === status);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REVIEW_STATUSES.map((status) => (
          <ReviewColumn
            key={status}
            status={status}
            label={COLUMN_LABELS[status]}
            deliverables={byStatus(status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeliverable ? (
          <DeliverableCard deliverable={activeDeliverable} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
