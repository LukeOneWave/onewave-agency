"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, AgentFormData } from "@/types/agent";

const PRESET_COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Pink", value: "#ec4899" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Rose", value: "#f43f5e" },
];

function parseSystemPrompt(systemPrompt: string): {
  role: string;
  personality: string;
  process: string;
} {
  function extractSection(prompt: string, section: string): string {
    const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = prompt.match(regex);
    return match ? match[1].trim() : "";
  }

  const role = extractSection(systemPrompt, "Role");
  const personality = extractSection(systemPrompt, "Personality");
  const process = extractSection(systemPrompt, "Process");

  // If parsing fails, put entire systemPrompt into role as fallback
  if (!role && !personality && !process) {
    return { role: systemPrompt, personality: "", process: "" };
  }

  return { role, personality, process };
}

function getInitialFormData(
  mode: "create" | "edit",
  agent?: Agent,
  cloneData?: AgentFormData
): AgentFormData {
  if (mode === "edit" && agent) {
    const { role, personality, process } = parseSystemPrompt(agent.systemPrompt);
    return {
      name: agent.name,
      division: agent.division,
      description: agent.description,
      role,
      personality,
      process,
      color: agent.color,
      tools: agent.tools ?? "",
    };
  }

  if (cloneData) {
    return {
      name: cloneData.name,
      division: cloneData.division,
      description: cloneData.description,
      role: cloneData.role,
      personality: cloneData.personality,
      process: cloneData.process,
      color: cloneData.color,
      tools: cloneData.tools ?? "",
    };
  }

  return {
    name: "",
    division: "",
    description: "",
    role: "",
    personality: "",
    process: "",
    color: PRESET_COLORS[0].value,
    tools: "",
  };
}

interface AgentFormProps {
  mode: "create" | "edit";
  agent?: Agent;
  divisions: string[];
  cloneData?: AgentFormData;
}

export function AgentForm({ mode, agent, divisions, cloneData }: AgentFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>(() =>
    getInitialFormData(mode, agent, cloneData)
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleColorSelect(color: string) {
    setFormData((prev) => ({ ...prev, color }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url =
        mode === "edit" && agent
          ? `/api/agents/${agent.id}`
          : "/api/agents";

      const method = mode === "edit" ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name,
        division: formData.division,
        description: formData.description,
        role: formData.role,
        personality: formData.personality,
        process: formData.process,
        color: formData.color,
      };

      if (formData.tools) {
        body.tools = formData.tools;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      toast.success(mode === "edit" ? "Agent saved" : "Agent created");
      router.push(`/agents/${data.slug}`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "edit" ? "Edit Agent" : "Create Agent";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., SEO Analyst"
              required
            />
          </div>

          {/* Division */}
          <div className="space-y-1.5">
            <label htmlFor="division" className="text-sm font-medium">
              Division
            </label>
            <select
              id="division"
              name="division"
              value={formData.division}
              onChange={handleChange}
              required
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="" disabled>
                Select a division
              </option>
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description shown on agent card"
              maxLength={500}
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Textarea
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="What does this agent do?"
              rows={4}
              required
            />
          </div>

          {/* Personality */}
          <div className="space-y-1.5">
            <label htmlFor="personality" className="text-sm font-medium">
              Personality
            </label>
            <Textarea
              id="personality"
              name="personality"
              value={formData.personality}
              onChange={handleChange}
              placeholder="How does this agent communicate?"
              rows={3}
              required
            />
          </div>

          {/* Process */}
          <div className="space-y-1.5">
            <label htmlFor="process" className="text-sm font-medium">
              Process
            </label>
            <Textarea
              id="process"
              name="process"
              value={formData.process}
              onChange={handleChange}
              placeholder="Step-by-step workflow this agent follows"
              rows={4}
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  onClick={() => handleColorSelect(preset.value)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: preset.value,
                    borderColor:
                      formData.color === preset.value ? "#fff" : "transparent",
                    outline:
                      formData.color === preset.value
                        ? `2px solid ${preset.value}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-1.5">
            <label htmlFor="tools" className="text-sm font-medium">
              Tools{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="tools"
              name="tools"
              value={formData.tools ?? ""}
              onChange={handleChange}
              placeholder="comma-separated: web-search, code-analysis"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                ? "Save Agent"
                : "Create Agent"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
