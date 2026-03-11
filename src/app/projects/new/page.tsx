import { ProjectForm } from "@/components/projects/ProjectForm";

export const metadata = {
  title: "New Project | OneWave",
  description: "Create a new project",
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-3xl font-bold">New Project</h1>
        <ProjectForm />
      </div>
    </div>
  );
}
