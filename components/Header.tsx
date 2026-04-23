"use client";
import { AudioLines } from "lucide-react";

export function Header({ credits }: { credits: number | null }) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-bg/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center">
          <AudioLines className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight">VO Studio</span>
          <span className="text-[10px] uppercase tracking-widest text-text-dim border border-border px-1.5 py-0.5 rounded">
            Personal
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {credits !== null ? (
          <span className="credit-pill">
            {credits.toLocaleString()} credits
          </span>
        ) : (
          <span className="text-xs text-text-dim font-mono">— credits</span>
        )}
      </div>
    </header>
  );
}
