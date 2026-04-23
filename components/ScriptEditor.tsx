"use client";
import { Pencil } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  chunkCount: number;
}

export function ScriptEditor({ value, onChange, chunkCount }: Props) {
  const chars = value.length;
  return (
    <div className="panel flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="label">
          <Pencil className="w-3 h-3" /> Script
        </div>
        <div className="flex items-center gap-4 text-xs text-text-dim font-mono">
          {chars > 0 && (
            <span>
              {chunkCount} {chunkCount === 1 ? "chunk" : "chunks"}
            </span>
          )}
          <span>{chars.toLocaleString()} characters</span>
        </div>
      </div>
      <textarea
        className="input flex-1 rounded-none border-0 bg-transparent focus:shadow-none p-4 scroll-thin"
        placeholder="Write or paste your script here. The AI will convert it to natural speech…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
