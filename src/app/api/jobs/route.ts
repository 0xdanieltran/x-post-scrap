import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireAuth,
} from "@/lib/api/helpers";
import { jobFiltersSchema } from "@/lib/validations/schemas";
import { getJobs } from "@/repositories/job-repository";
import { calculateJobMatch } from "@/services/matching/match-engine";
import { getUserPreferences } from "@/repositories/job-repository";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return errorResponse(error, 401);

  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  if (!rateLimit(`jobs:${ip}`)) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = jobFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid filters");
  }

  try {
    const { jobs, nextCursor } = await getJobs(parsed.data, user!.id);

    let jobsWithMatch = jobs;
    if (parsed.data.sort === "match") {
      const preferences = await getUserPreferences(user!.id);
      if (preferences) {
        jobsWithMatch = jobs.map((job) => ({
          ...job,
          match: calculateJobMatch(job, preferences),
        }));
      }
    }

    return jsonResponse({ jobs: jobsWithMatch, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return errorResponse(message, 500);
  }
}
