import { createClient } from "@/lib/supabase/server";
import { Briefcase, Bookmark, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: totalJobs }, { count: savedCount }, { data: recentJobs }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_rejected", false),
      supabase
        .from("saved_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id),
      supabase
        .from("jobs")
        .select("id, title, company, technologies, remote, created_at")
        .eq("is_rejected", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const stats = [
    {
      title: "Available Jobs",
      value: totalJobs ?? 0,
      icon: Briefcase,
      href: "/dashboard/jobs",
    },
    {
      title: "Saved Jobs",
      value: savedCount ?? 0,
      icon: Bookmark,
      href: "/dashboard/saved",
    },
    {
      title: "New Today",
      value: recentJobs?.length ?? 0,
      icon: TrendingUp,
      href: "/dashboard/jobs",
    },
    {
      title: "Last Updated",
      value: "Live",
      icon: Clock,
      href: "/dashboard/jobs",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your job search.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/jobs">View all</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {(recentJobs ?? []).map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{job.title ?? "Untitled"}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.company ?? "Unknown company"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.remote && <Badge variant="secondary">Remote</Badge>}
                  {(job.technologies as string[])?.slice(0, 2).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {(recentJobs ?? []).length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No jobs collected yet. Admin can trigger ingestion from the admin panel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
