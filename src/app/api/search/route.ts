import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireAuth,
} from "@/lib/api/helpers";
import { jobFiltersSchema } from "@/lib/validations/schemas";
import { getJobs } from "@/repositories/job-repository";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await requireAuth();
  if (error) return errorResponse(error, 401);

  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  if (!rateLimit(`search:${ip}`)) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = jobFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid search");
  }

  try {
    const { jobs, nextCursor } = await getJobs(parsed.data, user!.id);

    if (parsed.data.search) {
      await supabase.from("search_history").insert({
        user_id: user!.id,
        query: parsed.data.search,
        filters: parsed.data,
        results_count: jobs.length,
      });
    }

    return jsonResponse({ jobs, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return errorResponse(message, 500);
  }
}
