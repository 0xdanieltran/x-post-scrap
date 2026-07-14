import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAdmin,
} from "@/lib/api/helpers";
import { getXApiClient } from "@/services/x-api/client";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  try {
    const body = await request.json();
    const query = body.query as string;

    if (!query) {
      return errorResponse("Query is required");
    }

    const client = getXApiClient();
    const result = await client.searchRecentTweets(query, {
      maxResults: body.max_results ?? 10,
    });

    return jsonResponse({
      count: result.tweets.length,
      tweets: result.tweets,
      nextToken: result.nextToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return errorResponse(message, 500);
  }
}
