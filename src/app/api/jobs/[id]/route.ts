import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAuth,
} from "@/lib/api/helpers";
import { getJobById, getUserPreferences } from "@/repositories/job-repository";
import { calculateJobMatch } from "@/services/matching/match-engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return errorResponse(error, 401);

  const { id } = await params;

  try {
    const job = await getJobById(id);
    const preferences = await getUserPreferences(user!.id);
    const match = preferences ? calculateJobMatch(job, preferences) : null;

    return jsonResponse({ job, match });
  } catch {
    return errorResponse("Job not found", 404);
  }
}
