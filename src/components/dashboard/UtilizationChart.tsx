"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AgentUtilization {
  name: string;
  color: string;
  sessions: number;
}

interface UtilizationChartProps {
  data: AgentUtilization[];
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Agent Utilization</h2>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No agent usage data yet. Start chatting to see utilization.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip />
            <Bar dataKey="sessions">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
