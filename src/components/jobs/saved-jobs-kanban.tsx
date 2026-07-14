"use client";

import type { SavedJob, SavedJobStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const COLUMNS: { status: SavedJobStatus; label: string; color: string }[] = [
  { status: "saved", label: "Saved", color: "bg-blue-500" },
  { status: "applied", label: "Applied", color: "bg-yellow-500" },
  { status: "interview", label: "Interview", color: "bg-purple-500" },
  { status: "offer", label: "Offer", color: "bg-green-500" },
  { status: "rejected", label: "Rejected", color: "bg-red-500" },
];

interface SavedJobsKanbanProps {
  savedJobs: SavedJob[];
}

export function SavedJobsKanban({ savedJobs }: SavedJobsKanbanProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {COLUMNS.map((col) => {
          const items = savedJobs.filter((s) => s.status === col.status);
          return (
            <div key={col.status} className="w-72 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${col.color}`} />
                <h3 className="font-medium text-sm">{col.label}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {items.map((saved) => (
                  <Card key={saved.id} className="cursor-default">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {saved.job?.title ?? "Untitled"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground">
                        {saved.job?.company ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(saved.updated_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No jobs
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
