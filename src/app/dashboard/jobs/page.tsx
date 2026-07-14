import { JobFeed } from "@/components/jobs/job-feed";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Feed</h1>
        <p className="text-muted-foreground mt-1">
          Discover hiring posts aggregated from X
        </p>
      </div>
      <JobFeed />
    </div>
  );
}
