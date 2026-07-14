"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, TrendingUp, Database, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
  jobsToday: number;
  totalJobs: number;
  totalPosts: number;
  rejectedJobs: number;
  successRate: number;
  topTechnologies: { name: string; count: number }[];
  recentRuns: { id: string; status: string; imported_jobs: number; started_at: string }[];
}

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json() as Promise<AdminStats>;
    },
  });

  const statCards = [
    { title: "Jobs Today", value: stats?.jobsToday ?? 0, icon: TrendingUp },
    { title: "Total Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase },
    { title: "Total Posts", value: stats?.totalPosts ?? 0, icon: Database },
    { title: "Rejected", value: stats?.rejectedJobs ?? 0, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground mt-1">
          Platform analytics and collection metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-2">
                {(stats?.topTechnologies ?? []).map((tech) => (
                  <div key={tech.name} className="flex items-center justify-between">
                    <span className="text-sm">{tech.name}</span>
                    <Badge variant="secondary">{tech.count}</Badge>
                  </div>
                ))}
                {(stats?.topTechnologies ?? []).length === 0 && (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl font-bold text-primary">
                  {stats?.successRate ?? 0}%
                </div>
                <p className="text-muted-foreground mt-2">
                  Based on recent ingestion runs
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
