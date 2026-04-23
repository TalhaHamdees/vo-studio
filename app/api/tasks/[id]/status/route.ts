import { NextRequest } from "next/server";
import { getApiKey, missingKey, forwardJson } from "../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const key = getApiKey(req);
  if (!key) return missingKey();
  return forwardJson(`/tasks/${params.id}/status`, key);
}
