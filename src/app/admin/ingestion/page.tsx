"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { IngestionRun } from "@/types/database";

export default function AdminIngestionPage() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["ingestion-runs"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("ingestion_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      return (data ?? []) as IngestionRun[];
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ingestion</h1>
        <p className="text-muted-foreground mt-1">
          Monitor job ingestion runs and status
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {(runs ?? []).map((run) => (
          <Card key={run.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(run.status)}
                  <CardTitle className="text-base capitalize">
                    {run.status}
                  </CardTitle>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(run.started_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="outline">
                  Fetched: {run.fetched_posts}
                </Badge>
                <Badge variant="outline">
                  Imported: {run.imported_jobs}
                </Badge>
                <Badge variant="outline">
                  Rejected: {run.rejected_posts}
                </Badge>
                {run.duration_ms && (
                  <Badge variant="outline">
                    {(run.duration_ms / 1000).toFixed(1)}s
                  </Badge>
                )}
              </div>
              {run.error && (
                <p className="mt-2 text-sm text-destructive">{run.error}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && (runs ?? []).length === 0 && (
          <p className="text-center py-12 text-muted-foreground">
            No ingestion runs yet. Trigger a sync from the Queries page.
          </p>
        )}
      </div>
    </div>
  );
}
