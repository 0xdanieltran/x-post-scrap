import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { getXApiClient } from "@/services/x-api/client";
import { parseJobFromTweet } from "@/services/parser/job-parser";
import { checkSpam } from "@/services/spam/spam-filter";
import type { SearchQuery } from "@/types/database";

const LOCK_KEY = "global";
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

export interface IngestionResult {
  queryId: string;
  fetchedPosts: number;
  importedJobs: number;
  rejectedPosts: number;
  durationMs: number;
  error?: string;
}

async function acquireLock(runId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("ingestion_locks")
    .select("locked_at")
    .eq("id", LOCK_KEY)
    .maybeSingle();

  if (existing) {
    const lockedAt = new Date(existing.locked_at).getTime();
    if (Date.now() - lockedAt < LOCK_TIMEOUT_MS) {
      return false;
    }
  }

  await supabase.from("ingestion_locks").upsert({
    id: LOCK_KEY,
    locked_at: new Date().toISOString(),
    locked_by: runId,
  });

  return true;
}

async function releaseLock(): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("ingestion_locks").delete().eq("id", LOCK_KEY);
}

async function getSpamConfig() {
  const supabase = createServiceClient();

  const [{ data: keywords }, { data: domains }] = await Promise.all([
    supabase.from("blocked_keywords").select("keyword").eq("enabled", true),
    supabase.from("blocked_domains").select("domain").eq("enabled", true),
  ]);

  return {
    blockedKeywords: (keywords ?? []).map((k) => k.keyword),
    blockedDomains: (domains ?? []).map((d) => d.domain),
    minQualityScore: 30,
  };
}

async function getLatestTweetId(): Promise<string | undefined> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("x_posts")
    .select("tweet_id")
    .order("tweet_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.tweet_id;
}

export async function runIngestionForQuery(
  query: SearchQuery,
): Promise<IngestionResult> {
  const startTime = Date.now();
  const supabase = createServiceClient();
  const xClient = getXApiClient();
  const spamConfig = await getSpamConfig();

  const { data: run } = await supabase
    .from("ingestion_runs")
    .insert({
      query_id: query.id,
      status: "running",
    })
    .select()
    .single();

  let fetchedPosts = 0;
  let importedJobs = 0;
  let rejectedPosts = 0;

  try {
    const sinceId = await getLatestTweetId();
    const tweets = await xClient.fetchAllPages(query.query, {
      sinceId,
      maxPages: 3,
    });

    fetchedPosts = tweets.length;

    for (const tweet of tweets) {
      const { data: existing } = await supabase
        .from("x_posts")
        .select("id")
        .eq("tweet_id", tweet.tweet_id)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("x_posts").insert({
        tweet_id: tweet.tweet_id,
        author_id: tweet.author_id,
        username: tweet.username,
        display_name: tweet.display_name,
        text: tweet.text,
        url: tweet.url,
        language: tweet.language,
        hashtags: tweet.hashtags,
        metrics: tweet.metrics,
        media: tweet.media,
        urls: tweet.urls,
        is_verified: tweet.is_verified,
        raw_json: tweet.raw_json,
        tweet_created_at: tweet.tweet_created_at,
      });

      const parsed = parseJobFromTweet(tweet);
      const spamResult = checkSpam(tweet, parsed, spamConfig);

      if (spamResult.isRejected) {
        rejectedPosts++;
        await supabase.from("jobs").insert({
          tweet_id: tweet.tweet_id,
          ...parsed,
          quality_score: spamResult.qualityScore,
          rejection_reason: spamResult.rejectionReason,
          is_rejected: true,
        });
        continue;
      }

      await supabase.from("jobs").insert({
        tweet_id: tweet.tweet_id,
        company: parsed.company,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        country: parsed.country,
        remote: parsed.remote,
        employment_type: parsed.employment_type,
        seniority: parsed.seniority,
        technologies: parsed.technologies,
        salary_min: parsed.salary_min,
        salary_max: parsed.salary_max,
        currency: parsed.currency,
        application_url: parsed.application_url,
        application_email: parsed.application_email,
        recruiter: parsed.recruiter,
        quality_score: spamResult.qualityScore,
        is_rejected: false,
      });

      importedJobs++;
    }

    await supabase
      .from("search_queries")
      .update({ last_run: new Date().toISOString() })
      .eq("id", query.id);

    const durationMs = Date.now() - startTime;

    await supabase
      .from("ingestion_runs")
      .update({
        status: "completed",
        fetched_posts: fetchedPosts,
        imported_jobs: importedJobs,
        rejected_posts: rejectedPosts,
        duration_ms: durationMs,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    return {
      queryId: query.id,
      fetchedPosts,
      importedJobs,
      rejectedPosts,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        fetched_posts: fetchedPosts,
        imported_jobs: importedJobs,
        rejected_posts: rejectedPosts,
        duration_ms: durationMs,
        error: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    return {
      queryId: query.id,
      fetchedPosts,
      importedJobs,
      rejectedPosts,
      durationMs,
      error: message,
    };
  }
}

export async function runFullIngestion(): Promise<IngestionResult[]> {
  const runId = crypto.randomUUID();
  const acquired = await acquireLock(runId);

  if (!acquired) {
    throw new Error("Ingestion already running");
  }

  try {
    const supabase = createServiceClient();
    const { data: queries } = await supabase
      .from("search_queries")
      .select("*")
      .eq("enabled", true);

    const results: IngestionResult[] = [];

    for (const query of queries ?? []) {
      const result = await runIngestionForQuery(query as SearchQuery);
      results.push(result);
    }

    return results;
  } finally {
    await releaseLock();
  }
}

export async function runManualFetch(
  queryId: string,
): Promise<IngestionResult> {
  const supabase = createServiceClient();
  const { data: query, error } = await supabase
    .from("search_queries")
    .select("*")
    .eq("id", queryId)
    .single();

  if (error || !query) {
    throw new Error("Query not found");
  }

  return runIngestionForQuery(query as SearchQuery);
}
