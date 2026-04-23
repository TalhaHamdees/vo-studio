export const VOICER_BASE =
  process.env.VOICER_API_URL || "https://voiceapi.csv666.ru";

export type TaskStatus =
  | "waiting"
  | "processing"
  | "ending"
  | "ending_processed"
  | "error"
  | "error_handled";

export interface Template {
  uuid: string;
  name: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface BalanceResponse {
  telegram_id: number;
  balance: number;
  balance_text: string;
}

export interface TaskCreateResponse {
  task_id: number;
  message?: string;
}

export interface TaskStatusResponse {
  task_id: number;
  status: TaskStatus;
  status_label?: string;
  created_at: string;
}

export class VoicerError extends Error {
  status: number;
  detail?: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${VOICER_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text().catch(() => "");
    }
    const msg =
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as Record<string, unknown>).detail)
        : undefined) || `Voicer API ${res.status}`;
    throw new VoicerError(res.status, msg, detail);
  }
  return res.json() as Promise<T>;
}

export const voicer = {
  balance: (apiKey: string) =>
    request<BalanceResponse>("/balance", apiKey, { method: "GET" }),
  templates: (apiKey: string) =>
    request<Template[]>("/templates", apiKey, { method: "GET" }),
  createTask: (
    apiKey: string,
    body: { text: string; template_uuid: string; chunk_size?: number }
  ) =>
    request<TaskCreateResponse>("/tasks", apiKey, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  status: (apiKey: string, taskId: number) =>
    request<TaskStatusResponse>(`/tasks/${taskId}/status`, apiKey, {
      method: "GET",
    }),
  resultUrl: (taskId: number) => `${VOICER_BASE}/tasks/${taskId}/result`,
};
