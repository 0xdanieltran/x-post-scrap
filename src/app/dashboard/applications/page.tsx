"use client";

import { useQuery } from "@tanstack/react-query";
import { SavedJobsKanban } from "@/components/jobs/saved-jobs-kanban";
import type { SavedJob } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsPage() {
  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("saved_jobs")
        .select("*, job:jobs(*, x_post:x_posts(*))")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false });

      return (data ?? []) as SavedJob[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-1">
          Track your application pipeline
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <SavedJobsKanban savedJobs={savedJobs ?? []} />
      )}
    </div>
  );
}
