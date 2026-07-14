"use client";

import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/jobs/job-card";
import { SavedJobsKanban } from "@/components/jobs/saved-jobs-kanban";
import type { SavedJob } from "@/types/database";

export default function SavedJobsPage() {
  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("saved_jobs")
        .select("*, job:jobs(*, x_post:x_posts(*))")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      return (data ?? []) as SavedJob[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Track jobs you&apos;re interested in
        </p>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          )}
          {!isLoading && (savedJobs ?? []).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No saved jobs yet</p>
              <p className="mt-1">Save jobs from the feed to track them here.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {(savedJobs ?? []).map((saved) =>
              saved.job ? (
                <JobCard key={saved.id} job={saved.job} isSaved />
              ) : null
            )}
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <SavedJobsKanban savedJobs={savedJobs ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
