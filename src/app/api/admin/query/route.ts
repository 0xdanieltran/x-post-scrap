import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAdmin,
} from "@/lib/api/helpers";
import { searchQuerySchema } from "@/lib/validations/schemas";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  const body = await request.json();
  const parsed = searchQuerySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("search_queries")
    .insert(parsed.data)
    .select()
    .single();

  if (dbError) return errorResponse(dbError.message, 500);
  return jsonResponse(data, 201);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("search_queries")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) return errorResponse(dbError.message, 500);
  return jsonResponse(data);
}
