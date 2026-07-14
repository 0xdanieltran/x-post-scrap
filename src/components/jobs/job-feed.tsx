"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/jobs/job-card";
import { useJobFilterStore } from "@/stores/job-store";
import type { Job, JobMatchResult } from "@/types/database";

async function fetchJobs(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/jobs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json() as Promise<{
    jobs: (Job & { match?: JobMatchResult })[];
    nextCursor?: string;
  }>;
}

export function JobFeed() {
  const { filters, setFilter, resetFilters } = useJobFilterStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryKey = ["jobs", filters];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchJobs({
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
        ),
        cursor: pageParam ?? "",
      } as Record<string, string>),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const jobs = data?.pages.flatMap((p) => p.jobs) ?? [];

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, technologies..."
            className="pl-9"
            value={filters.search ?? ""}
            onChange={(e) => setFilter("search", e.target.value || undefined)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.sort ?? "newest"}
            onValueChange={(v) =>
              setFilter("sort", v as typeof filters.sort)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="match">Best Match</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.remote === true ? "remote" : filters.remote === false ? "onsite" : "all"}
            onValueChange={(v) =>
              setFilter("remote", v === "remote" ? true : v === "onsite" ? false : undefined)
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={resetFilters}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load jobs. Please try again.
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-medium">No jobs found</p>
          <p className="text-muted-foreground mt-1">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
