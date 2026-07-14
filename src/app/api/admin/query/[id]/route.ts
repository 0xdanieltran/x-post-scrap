import { NextRequest } from "next/server";
import {
  errorResponse,
  jsonResponse,
  requireAdmin,
} from "@/lib/api/helpers";
import { searchQuerySchema } from "@/lib/validations/schemas";
import { createServiceClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  const { id } = await params;
  const body = await request.json();
  const parsed = searchQuerySchema.partial().safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("search_queries")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (dbError) return errorResponse(dbError.message, 500);
  return jsonResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return errorResponse(error, error === "Forbidden" ? 403 : 401);

  const { id } = await params;
  const supabase = createServiceClient();

  const { error: dbError } = await supabase
    .from("search_queries")
    .delete()
    .eq("id", id);

  if (dbError) return errorResponse(dbError.message, 500);
  return jsonResponse({ success: true });
}
