import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAuth,
} from "@/lib/api/helpers";
import { updateSavedJobSchema } from "@/lib/validations/schemas";
import { updateSavedJob } from "@/repositories/job-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return errorResponse(error, 401);

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSavedJobSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const saved = await updateSavedJob(id, user!.id, parsed.data);
    return jsonResponse(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return errorResponse(message, 500);
  }
}
