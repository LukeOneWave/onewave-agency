import { dashboardService } from "@/lib/services/dashboard";
import { StatCards } from "@/components/dashboard/StatCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";

export default async function DashboardPage() {
  const [stats, activities, utilization, pendingReview] = await Promise.all([
    dashboardService.getStats(),
    dashboardService.getRecentActivity(20),
    dashboardService.getAgentUtilization(),
    dashboardService.getPendingReview(5),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Good vibes only</h1>
        <p className="text-muted-foreground mt-1">Here's what your agents have been up to.</p>
      </div>

      <StatCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <ActivityFeed activities={activities} />
          <UtilizationChart data={utilization} />
        </div>
        <div>
          <ReviewQueue items={pendingReview} />
        </div>
      </div>
    </div>
  );
}
