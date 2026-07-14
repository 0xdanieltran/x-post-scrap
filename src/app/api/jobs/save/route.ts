import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAuth,
} from "@/lib/api/helpers";
import { saveJobSchema } from "@/lib/validations/schemas";
import { saveJob } from "@/repositories/job-repository";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return errorResponse(error, 401);

  const body = await request.json();
  const parsed = saveJobSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const saved = await saveJob(
      user!.id,
      parsed.data.job_id,
      parsed.data.status,
      parsed.data.notes
    );
    return jsonResponse(saved, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save job";
    return errorResponse(message, 500);
  }
}
