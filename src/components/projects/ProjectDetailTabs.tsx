"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { DeliverablesList } from "@/components/projects/DeliverablesList";
import type { TaskWithAgent } from "@/types/project";

interface AgentForForm {
  id: string;
  name: string;
  color: string;
}

interface DeliverableVersion {
  id: string;
  version: number;
  createdAt: string | Date;
}

interface DeliverableWithVersions {
  id: string;
  content: string | null;
  status: string;
  createdAt: string | Date;
  versions: DeliverableVersion[];
}

interface ProjectDetailTabsProps {
  tasks: TaskWithAgent[];
  projectId: string;
  agents: AgentForForm[];
  deliverables: DeliverableWithVersions[];
}

export function ProjectDetailTabs({
  tasks,
  projectId,
  agents,
  deliverables,
}: ProjectDetailTabsProps) {
  return (
    <Tabs defaultValue="board">
      <TabsList>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="deliverables">
          Deliverables
          {deliverables.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {deliverables.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="board">
        <KanbanBoard
          initialTasks={tasks}
          projectId={projectId}
          agents={agents}
        />
      </TabsContent>

      <TabsContent value="deliverables">
        <DeliverablesList deliverables={deliverables} />
      </TabsContent>
    </Tabs>
  );
}
