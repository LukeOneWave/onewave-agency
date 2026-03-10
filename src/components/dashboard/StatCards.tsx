import { Activity, Users, Zap } from "lucide-react";

interface StatCardsProps {
  stats: {
    activeSessions: number;
    agentsUsed: number;
    tokensConsumed: number;
  };
}

export function StatCards({ stats }: StatCardsProps) {
  const tokenDisplay = new Intl.NumberFormat("en", {
    notation: "compact",
  }).format(stats.tokensConsumed);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex items-center gap-4 rounded-2xl bg-card p-6 shadow-sm">
        <div className="rounded-xl bg-primary/10 p-3">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.activeSessions}</p>
          <p className="text-sm text-muted-foreground">Active Sessions</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl bg-card p-6 shadow-sm">
        <div className="rounded-xl bg-accent p-3">
          <Users className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.agentsUsed}</p>
          <p className="text-sm text-muted-foreground">Agents Used</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl bg-card p-6 shadow-sm">
        <div className="rounded-xl bg-secondary p-3">
          <Zap className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">{tokenDisplay}</p>
          <p className="text-sm text-muted-foreground">Tokens Consumed</p>
        </div>
      </div>
    </div>
  );
}
