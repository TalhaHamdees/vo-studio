"use client";
import type {
  BalanceResponse,
  Template,
  TaskCreateResponse,
  TaskStatusResponse,
} from "./voicer";

async function call<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = String(j.detail);
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  balance: (apiKey: string) => call<BalanceResponse>("/api/balance", apiKey),
  templates: (apiKey: string) => call<Template[]>("/api/templates", apiKey),
  createTask: (
    apiKey: string,
    body: { text: string; template_uuid: string; chunk_size?: number }
  ) =>
    call<TaskCreateResponse>("/api/tasks", apiKey, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  status: (apiKey: string, taskId: number) =>
    call<TaskStatusResponse>(`/api/tasks/${taskId}/status`, apiKey),
  result: async (apiKey: string, taskId: number): Promise<Response> => {
    const res = await fetch(`/api/tasks/${taskId}/result`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) throw new Error(`Result fetch failed: ${res.status}`);
    return res;
  },
};

export async function waitForTask(
  apiKey: string,
  taskId: number,
  onStatus?: (s: string) => void,
  intervalMs = 2000,
  timeoutMs = 10 * 60 * 1000
): Promise<void> {
  const start = Date.now();
  while (true) {
    const s = await api.status(apiKey, taskId);
    onStatus?.(s.status);
    if (s.status === "ending_processed" || s.status === "ending") return;
    if (s.status === "error" || s.status === "error_handled") {
      throw new Error("Task failed on server");
    }
    if (Date.now() - start > timeoutMs) throw new Error("Task timed out");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
