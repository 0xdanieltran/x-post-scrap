"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchHistoryEntry } from "@/types/database";

export default function SearchHistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["search-history"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return (data ?? []) as SearchHistoryEntry[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search History</h1>
        <p className="text-muted-foreground mt-1">
          Your recent job searches
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (history ?? []).length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No search history</p>
          <p className="mt-1">Your searches will appear here.</p>
        </div>
      )}

      <div className="space-y-2">
        {(history ?? []).map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">&quot;{entry.query}&quot;</p>
                <p className="text-sm text-muted-foreground">
                  {entry.results_count} results
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(entry.created_at), {
                  addSuffix: true,
                })}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
