"use client";
import { Volume2, Loader2, Download, Archive, X } from "lucide-react";

export type GenState =
  | { kind: "idle" }
  | {
      kind: "running";
      chunkIndex: number;
      chunkCount: number;
      statusLabel: string;
    }
  | { kind: "done"; chunkCount: number }
  | { kind: "error"; message: string };

interface Props {
  disabled: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  onDownloadMp3: () => void;
  onDownloadZip: () => void;
  state: GenState;
  hasAudio: boolean;
}

export function GenerateBar({
  disabled,
  onGenerate,
  onCancel,
  onDownloadMp3,
  onDownloadZip,
  state,
  hasAudio,
}: Props) {
  if (state.kind === "running") {
    const pct = Math.round(((state.chunkIndex - 1) / state.chunkCount) * 100);
    return (
      <div className="panel p-4 flex items-center gap-4">
        <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-text-dim mb-1.5">
            <span>
              Chunk {state.chunkIndex} of {state.chunkCount} · {state.statusLabel}
            </span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button className="btn-ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    );
  }

  if (state.kind === "done" && hasAudio) {
    return (
      <div className="panel p-3 flex items-center gap-3">
        <div className="flex-1 text-sm text-text-dim px-2">
          Generated {state.chunkCount} {state.chunkCount === 1 ? "chunk" : "chunks"} · ready
        </div>
        <button className="btn-outline" onClick={onDownloadZip}>
          <Archive className="w-4 h-4" />
          Download ZIP
        </button>
        <button className="btn-primary" onClick={onDownloadMp3}>
          <Download className="w-4 h-4" />
          Download MP3
        </button>
        <button className="btn-ghost" onClick={onGenerate} disabled={disabled}>
          Regenerate
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-2">
      <button
        className="btn-primary w-full py-3 text-base"
        onClick={onGenerate}
        disabled={disabled}
      >
        <Volume2 className="w-4 h-4" />
        Generate Speech
      </button>
      {state.kind === "error" && (
        <p className="text-xs text-red-400 mt-2 px-2 font-mono">{state.message}</p>
      )}
    </div>
  );
}
