"use client";
import {
  X,
  Plus,
  Trash2,
  Play,
  Download,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  PronunciationEntry,
  newEntryId,
  exportLibrary,
  importLibrary,
} from "@/lib/pronunciation";
import { api, waitForTask } from "@/lib/client";
import { extractAudioFromResponse } from "@/lib/audio";
import type { Template } from "@/lib/voicer";

interface Props {
  open: boolean;
  onClose: () => void;
  entries: PronunciationEntry[];
  onChange: (entries: PronunciationEntry[]) => void;
  apiKey: string;
  templates: Template[];
  selectedTemplate: string;
}

export function PronunciationLibrary({
  open,
  onClose,
  entries,
  onChange,
  apiKey,
  templates,
  selectedTemplate,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testVoiceId, setTestVoiceId] = useState(selectedTemplate);
  const [testAudio, setTestAudio] = useState<{ id: string; url: string } | null>(null);
  const [useContext, setUseContext] = useState(false);

  if (!open) return null;

  const voiceId = testVoiceId || selectedTemplate || templates[0]?.uuid || "";

  const add = () => {
    onChange([
      ...entries,
      { id: newEntryId(), word: "", replacement: "", caseInsensitive: false },
    ]);
  };

  const update = (id: string, patch: Partial<PronunciationEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const remove = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const testEntry = async (entry: PronunciationEntry) => {
    if (!apiKey) return alert("Enter API key first");
    if (!voiceId) return alert("Select a voice template first");
    if (!entry.replacement.trim()) return alert("Add a replacement first");
    setTestingId(entry.id);
    setTestAudio(null);
    try {
      const phrase = useContext
        ? `The name ${entry.replacement} sounded familiar.`
        : entry.replacement;
      const { task_id } = await api.createTask(apiKey, {
        text: phrase,
        template_uuid: voiceId,
      });
      await waitForTask(apiKey, task_id);
      const res = await api.result(apiKey, task_id);
      const blobs = await extractAudioFromResponse(res);
      if (blobs.length) {
        const url = URL.createObjectURL(blobs[0]);
        setTestAudio({ id: entry.id, url });
      }
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setTestingId(null);
    }
  };

  const onExport = () => {
    const blob = new Blob([exportLibrary(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pronunciation-library.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportClick = () => fileRef.current?.click();

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importLibrary(text);
      const existing = new Map(entries.map((e) => [e.word, e]));
      for (const i of imported) existing.set(i.word, i);
      onChange(Array.from(existing.values()));
    } catch (e: unknown) {
      alert("Invalid library file: " + (e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="panel w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="font-semibold">Pronunciation Library</h2>
            <p className="text-xs text-text-dim">
              Words are replaced at submit time — your script stays unchanged in the editor.
            </p>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <button className="btn-outline" onClick={add}>
            <Plus className="w-4 h-4" /> Add entry
          </button>
          <button className="btn-ghost" onClick={onImportClick}>
            <Upload className="w-4 h-4" /> Import
          </button>
          <button className="btn-ghost" onClick={onExport} disabled={!entries.length}>
            <Download className="w-4 h-4" /> Export
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <div className="ml-auto flex items-center gap-3 text-xs text-text-dim">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useContext}
                onChange={(e) => setUseContext(e.target.checked)}
                className="accent-accent"
              />
              Test in sentence
            </label>
            <select
              className="input py-1 text-xs w-40"
              value={voiceId}
              onChange={(e) => setTestVoiceId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.uuid} value={t.uuid}>
                  Test: {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {entries.length === 0 ? (
            <div className="p-10 text-center text-text-dim text-sm">
              No entries yet. Add a word + respelling (e.g. Daenerys → Dahnairiss), then
              use Test to preview.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated/50 text-text-dim text-xs">
                <tr>
                  <th className="text-left font-medium px-5 py-2 w-1/3">Word</th>
                  <th className="text-left font-medium px-2 py-2">Replacement</th>
                  <th className="text-center font-medium px-2 py-2 w-20">Any case</th>
                  <th className="px-2 py-2 w-36"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-5 py-2">
                      <input
                        className="input"
                        value={e.word}
                        onChange={(ev) => update(e.id, { word: ev.target.value })}
                        placeholder="Daenerys"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="input"
                        value={e.replacement}
                        onChange={(ev) => update(e.id, { replacement: ev.target.value })}
                        placeholder="Dahnairiss"
                      />
                    </td>
                    <td className="text-center px-2 py-2">
                      <input
                        type="checkbox"
                        checked={e.caseInsensitive}
                        onChange={(ev) =>
                          update(e.id, { caseInsensitive: ev.target.checked })
                        }
                        className="accent-accent"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {testAudio?.id === e.id && (
                          <audio src={testAudio.url} controls className="h-6 w-32" />
                        )}
                        <button
                          className="btn-ghost !px-2 !py-1"
                          onClick={() => testEntry(e)}
                          disabled={testingId !== null}
                          title="Test pronunciation"
                        >
                          {testingId === e.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          className="btn-ghost !px-2 !py-1 hover:text-red-400"
                          onClick={() => remove(e.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-text-dim">
          <span>{entries.length} entries</span>
          <button className="btn-primary" onClick={onClose}>
            <Check className="w-4 h-4" /> Done
          </button>
        </footer>
      </div>
    </div>
  );
}
