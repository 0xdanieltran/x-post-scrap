import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/api/helpers";
import { runFullIngestion } from "@/services/ingestion/ingestion-service";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const results = await runFullIngestion();
    return Response.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
