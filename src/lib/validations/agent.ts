import { z } from "zod/v4";

export const CreateAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  division: z.string().min(1, "Division is required"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  role: z.string().min(1, "Role is required"),
  personality: z.string().min(1, "Personality is required"),
  process: z.string().min(1, "Process is required"),
  color: z.string().default("#6366f1"),
  tools: z.string().optional(),
});

export const UpdateAgentSchema = CreateAgentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);
