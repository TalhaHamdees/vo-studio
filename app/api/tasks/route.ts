import { NextRequest } from "next/server";
import { getApiKey, missingKey, forwardJson } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = getApiKey(req);
  if (!key) return missingKey();
  const body = await req.text();
  return forwardJson("/tasks", key, { method: "POST", body });
}
