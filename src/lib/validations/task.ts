import { z } from "zod/v4";
import { TASK_STATUSES } from "@/types/project";

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  assignedAgentId: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
  order: z.number().int().min(0),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
