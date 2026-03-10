import { dashboardService } from "@/lib/services/dashboard";
import { StatCards } from "@/components/dashboard/StatCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";

export default async function DashboardPage() {
  const [stats, activities, utilization] = await Promise.all([
    dashboardService.getStats(),
    dashboardService.getRecentActivity(20),
    dashboardService.getAgentUtilization(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <StatCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ActivityFeed activities={activities} />
        <UtilizationChart data={utilization} />
      </div>
    </div>
  );
}
