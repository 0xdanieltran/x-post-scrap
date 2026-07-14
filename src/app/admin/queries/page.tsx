"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchQuery } from "@/types/database";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function AdminQueriesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    query: "",
    enabled: true,
    interval_minutes: 60,
  });

  const { data: queries, isLoading } = useQuery({
    queryKey: ["admin-queries"],
    queryFn: async () => {
      const res = await fetch("/api/admin/query");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<SearchQuery[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queries"] });
      setOpen(false);
      setForm({ name: "", query: "", enabled: true, interval_minutes: 60 });
      toast.success("Query created!");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (queryId?: string) => {
      const res = await fetch("/api/x/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query_id: queryId }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Synced: ${data.importedJobs ?? data.results?.[0]?.importedJobs ?? 0} jobs imported`
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/query/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queries"] });
      toast.success("Query deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Queries</h1>
          <p className="text-muted-foreground mt-1">
            Manage X API search queries for job ingestion
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate(undefined)}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run All
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Query
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Search Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>X Search Query</Label>
                  <Textarea
                    value={form.query}
                    onChange={(e) => setForm({ ...form, query: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interval (minutes)</Label>
                  <Input
                    type="number"
                    min={30}
                    max={1440}
                    value={form.interval_minutes}
                    onChange={(e) =>
                      setForm({ ...form, interval_minutes: parseInt(e.target.value, 10) })
                    }
                  />
                </div>
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending}
                >
                  Create Query
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {(queries ?? []).map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{q.name}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs break-all">
                    {q.query}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={q.enabled ? "default" : "secondary"}>
                    {q.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{q.interval_minutes}m</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Last run:{" "}
                {q.last_run
                  ? formatDistanceToNow(new Date(q.last_run), { addSuffix: true })
                  : "Never"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncMutation.mutate(q.id)}
                  disabled={syncMutation.isPending}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Fetch Now
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(q.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
