import {
  errorResponse,
  jsonResponse,
  requireAdmin,
} from "@/lib/api/helpers";
import { getAdminStats } from "@/repositories/job-repository";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  try {
    const stats = await getAdminStats();
    return jsonResponse(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get stats";
    return errorResponse(message, 500);
  }
}
