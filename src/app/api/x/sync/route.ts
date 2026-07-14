import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAdmin,
  verifyCronSecret,
} from "@/lib/api/helpers";
import { runFullIngestion, runManualFetch } from "@/services/ingestion/ingestion-service";

export async function POST(request: NextRequest) {
  const isCron = verifyCronSecret(request);

  if (!isCron) {
    const { error } = await requireAdmin();
    if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const queryId = body.query_id as string | undefined;

    if (queryId) {
      const result = await runManualFetch(queryId);
      return jsonResponse(result);
    }

    const results = await runFullIngestion();
    return jsonResponse({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return errorResponse(message, 500);
  }
}
