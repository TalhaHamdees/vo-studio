"use client";
import { Key, Mic2, RefreshCw, BookOpen, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { Template } from "@/lib/voicer";

interface Props {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  templates: Template[];
  templatesLoading: boolean;
  templatesError: string | null;
  selectedTemplate: string;
  onTemplateChange: (uuid: string) => void;
  onRefreshTemplates: () => void;
  onOpenLibrary: () => void;
  libraryCount: number;
}

export function Sidebar({
  apiKey,
  onApiKeyChange,
  templates,
  templatesLoading,
  templatesError,
  selectedTemplate,
  onTemplateChange,
  onRefreshTemplates,
  onOpenLibrary,
  libraryCount,
}: Props) {
  const [reveal, setReveal] = useState(false);

  return (
    <aside className="w-72 shrink-0 border-r border-border p-4 flex flex-col gap-5 overflow-y-auto scroll-thin">
      <section>
        <label className="label mb-2">
          <Key className="w-3 h-3" /> API Key
        </label>
        <div className="relative">
          <input
            type={reveal ? "text" : "password"}
            className="input pr-9 font-mono tracking-widest"
            placeholder="Paste your Voicer API key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-1"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide key" : "Show key"}
          >
            {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[11px] text-text-dim mt-1.5">
          Stored locally in this browser only.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            <Mic2 className="w-3 h-3" /> Voice Template
          </label>
          <button
            className="text-text-dim hover:text-text transition p-1"
            onClick={onRefreshTemplates}
            disabled={!apiKey || templatesLoading}
            aria-label="Refresh templates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${templatesLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <select
          className="input"
          value={selectedTemplate}
          onChange={(e) => onTemplateChange(e.target.value)}
          disabled={!templates.length}
        >
          {!templates.length && (
            <option value="">
              {apiKey ? "No templates found" : "Enter API key first"}
            </option>
          )}
          {templates.map((t) => (
            <option key={t.uuid} value={t.uuid}>
              {t.name}
            </option>
          ))}
        </select>
        {templatesError && (
          <p className="text-[11px] text-red-400 mt-1.5">{templatesError}</p>
        )}
      </section>

      <section>
        <label className="label mb-2">
          <BookOpen className="w-3 h-3" /> Pronunciation Library
        </label>
        <button className="btn-outline w-full justify-between" onClick={onOpenLibrary}>
          <span>Manage entries</span>
          <span className="text-xs text-text-dim font-mono">{libraryCount}</span>
        </button>
        <p className="text-[11px] text-text-dim mt-1.5 leading-relaxed">
          Auto-replaces tricky names (e.g. ASOIAF) with phonetic respellings before
          synthesis.
        </p>
      </section>

      <div className="mt-auto text-[11px] text-text-dim font-mono pt-4">
        VO Studio · v1.0
      </div>
    </aside>
  );
}
