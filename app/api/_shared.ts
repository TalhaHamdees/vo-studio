import { NextRequest, NextResponse } from "next/server";
import { VOICER_BASE } from "@/lib/voicer";

export function getApiKey(req: NextRequest): string | null {
  return req.headers.get("x-api-key");
}

export function missingKey() {
  return NextResponse.json({ detail: "Missing API key" }, { status: 401 });
}

export async function forwardJson(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  const upstream = await fetch(`${VOICER_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}
