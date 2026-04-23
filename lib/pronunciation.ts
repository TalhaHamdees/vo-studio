export interface PronunciationEntry {
  id: string;
  word: string;
  replacement: string;
  caseInsensitive: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCase(source: string, target: string): string {
  if (source === source.toUpperCase() && source.length > 1) return target.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

export function applyPronunciation(
  text: string,
  entries: PronunciationEntry[]
): string {
  if (!entries.length) return text;
  let out = text;
  for (const e of entries) {
    if (!e.word.trim() || !e.replacement.trim()) continue;
    const flags = e.caseInsensitive ? "gi" : "g";
    const re = new RegExp(`\\b${escapeRegex(e.word)}\\b`, flags);
    out = out.replace(re, (match) =>
      e.caseInsensitive ? preserveCase(match, e.replacement) : e.replacement
    );
  }
  return out;
}

export function newEntryId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function exportLibrary(entries: PronunciationEntry[]): string {
  return JSON.stringify(
    entries.map(({ word, replacement, caseInsensitive }) => ({
      word,
      replacement,
      caseInsensitive,
    })),
    null,
    2
  );
}

export function importLibrary(json: string): PronunciationEntry[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
  return parsed
    .filter((x) => x && typeof x.word === "string" && typeof x.replacement === "string")
    .map((x) => ({
      id: newEntryId(),
      word: String(x.word),
      replacement: String(x.replacement),
      caseInsensitive: Boolean(x.caseInsensitive),
    }));
}
