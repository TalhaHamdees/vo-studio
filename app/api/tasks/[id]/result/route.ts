import { NextRequest, NextResponse } from "next/server";
import { VOICER_BASE } from "@/lib/voicer";
import { getApiKey, missingKey } from "../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const key = getApiKey(req);
  if (!key) return missingKey();
  const upstream = await fetch(`${VOICER_BASE}/tasks/${params.id}/result`, {
    headers: { "X-API-Key": key },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Upstream error", {
      status: upstream.status,
    });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ||
        `attachment; filename="task_${params.id}"`,
    },
  });
}
