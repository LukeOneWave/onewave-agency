"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDivision(division: string) {
  return division
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function DivisionTabs({
  divisions,
  activeDivision,
}: {
  divisions: string[];
  activeDivision: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("division");
    } else {
      params.set("division", value);
    }
    router.push(`/agents?${params.toString()}`);
  }

  return (
    <Tabs value={activeDivision || "all"} onValueChange={handleChange}>
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="all">All</TabsTrigger>
        {divisions.map((d) => (
          <TabsTrigger key={d} value={d}>
            {formatDivision(d)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
