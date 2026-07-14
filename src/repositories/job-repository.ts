import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobFilters, SavedJob, UserPreferences } from "@/types/database";
import { calculateJobMatch } from "@/services/matching/match-engine";

export async function getJobs(filters: JobFilters, userId?: string) {
  const supabase = createServiceClient();
  const limit = filters.limit ?? 20;

  let query = supabase
    .from("jobs")
    .select("*, x_post:x_posts(*)")
    .eq("is_rejected", false);

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  if (filters.technology) {
    query = query.contains("technologies", [filters.technology]);
  }

  if (filters.company) {
    query = query.ilike("company", `%${filters.company}%`);
  }

  if (filters.remote !== undefined) {
    query = query.eq("remote", filters.remote);
  }

  if (filters.country) {
    query = query.ilike("country", `%${filters.country}%`);
  }

  if (filters.seniority) {
    query = query.eq("seniority", filters.seniority);
  }

  if (filters.employment_type) {
    query = query.eq("employment_type", filters.employment_type);
  }

  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  if (filters.salary_min) {
    query = query.gte("salary_max", filters.salary_min);
  }

  switch (filters.sort) {
    case "salary":
      query = query.order("salary_max", { ascending: false, nullsFirst: false });
      break;
    case "popular":
      query = query.order("quality_score", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  if (filters.cursor) {
    query = query.lt("created_at", filters.cursor);
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) throw error;

  let jobs = (data ?? []) as Job[];

  if (filters.sort === "match" && userId) {
    const preferences = await getUserPreferences(userId);
    if (preferences) {
      jobs = jobs
        .map((job) => ({
          job,
          match: calculateJobMatch(job, preferences),
        }))
        .sort((a, b) => b.match.percentage - a.match.percentage)
        .map(({ job }) => job);
    }
  }

  const nextCursor =
    jobs.length === limit ? jobs[jobs.length - 1]?.created_at : undefined;

  return { jobs, nextCursor };
}

export async function getJobById(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, x_post:x_posts(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Job;
}

export async function getUserPreferences(userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data as UserPreferences | null;
}

export async function getSavedJobs(userId: string, status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("saved_jobs")
    .select("*, job:jobs(*, x_post:x_posts(*))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SavedJob[];
}

export async function saveJob(
  userId: string,
  jobId: string,
  status = "saved",
  notes?: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_jobs")
    .upsert(
      { user_id: userId, job_id: jobId, status, notes },
      { onConflict: "user_id,job_id" }
    )
    .select("*, job:jobs(*, x_post:x_posts(*))")
    .single();

  if (error) throw error;
  return data as SavedJob;
}

export async function updateSavedJob(
  id: string,
  userId: string,
  updates: { status?: string; notes?: string }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_jobs")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, job:jobs(*, x_post:x_posts(*))")
    .single();

  if (error) throw error;
  return data as SavedJob;
}

export async function getAdminStats() {
  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: jobsToday },
    { count: totalJobs },
    { count: totalPosts },
    { count: rejectedJobs },
    { data: recentRuns },
    { data: topTech },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .eq("is_rejected", false),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_rejected", false),
    supabase.from("x_posts").select("*", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_rejected", true),
    supabase
      .from("ingestion_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase.from("jobs").select("technologies").eq("is_rejected", false),
  ]);

  const techCounts: Record<string, number> = {};
  (topTech ?? []).forEach((job) => {
    (job.technologies as string[]).forEach((tech) => {
      techCounts[tech] = (techCounts[tech] ?? 0) + 1;
    });
  });

  const topTechnologies = Object.entries(techCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const successRuns = (recentRuns ?? []).filter(
    (r) => r.status === "completed"
  ).length;
  const successRate =
    recentRuns && recentRuns.length > 0
      ? Math.round((successRuns / recentRuns.length) * 100)
      : 100;

  return {
    jobsToday: jobsToday ?? 0,
    totalJobs: totalJobs ?? 0,
    totalPosts: totalPosts ?? 0,
    rejectedJobs: rejectedJobs ?? 0,
    successRate,
    topTechnologies,
    recentRuns: recentRuns ?? [],
  };
}
