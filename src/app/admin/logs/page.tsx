"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AdminLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as AuditLog[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          System activity and audit trail
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {(logs ?? []).map((log) => (
          <Card key={log.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-sm">{log.action}</p>
                {log.resource && (
                  <p className="text-xs text-muted-foreground">
                    {log.resource} {log.resource_id && `#${log.resource_id}`}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (logs ?? []).length === 0 && (
          <p className="text-center py-12 text-muted-foreground">
            No audit logs yet.
          </p>
        )}
      </div>
    </div>
  );
}
