"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ScriptEditor } from "@/components/ScriptEditor";
import { GenerateBar, type GenState } from "@/components/GenerateBar";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PronunciationLibrary } from "@/components/PronunciationLibrary";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { api, waitForTask } from "@/lib/client";
import { splitIntoChunks } from "@/lib/chunker";
import { applyPronunciation, PronunciationEntry } from "@/lib/pronunciation";
import {
  extractAudioFromResponse,
  concatMp3Blobs,
  zipBlobs,
  downloadBlob,
} from "@/lib/audio";
import type { Template } from "@/lib/voicer";

const CHUNK_TARGET = 5000;
const CHUNK_MIN = 2500;

export default function Page() {
  const [apiKey, setApiKey] = useLocalStorage<string>("vs.apiKey", "");
  const [script, setScript] = useLocalStorage<string>("vs.script", "");
  const [selectedTemplate, setSelectedTemplate] = useLocalStorage<string>(
    "vs.template",
    ""
  );
  const [library, setLibrary] = useLocalStorage<PronunciationEntry[]>(
    "vs.library",
    []
  );

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [genState, setGenState] = useState<GenState>({ kind: "idle" });
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const cancelRef = useRef(false);

  const processedText = useMemo(
    () => applyPronunciation(script, library),
    [script, library]
  );
  const chunks = useMemo(
    () => splitIntoChunks(processedText, CHUNK_TARGET, CHUNK_MIN),
    [processedText]
  );

  const refreshAccount = useCallback(async () => {
    if (!apiKey) {
      setTemplates([]);
      setCredits(null);
      return;
    }
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const [b, t] = await Promise.all([
        api.balance(apiKey).catch(() => null),
        api.templates(apiKey),
      ]);
      if (b) setCredits(b.balance);
      setTemplates(t);
      if (!selectedTemplate && t.length) setSelectedTemplate(t[0].uuid);
      if (selectedTemplate && !t.find((x) => x.uuid === selectedTemplate) && t.length) {
        setSelectedTemplate(t[0].uuid);
      }
    } catch (e: unknown) {
      setTemplatesError((e as Error).message);
    } finally {
      setTemplatesLoading(false);
    }
  }, [apiKey, selectedTemplate, setSelectedTemplate]);

  useEffect(() => {
    if (apiKey) refreshAccount();
    else {
      setTemplates([]);
      setCredits(null);
    }
  }, [apiKey, refreshAccount]);

  const canGenerate =
    apiKey.length > 0 &&
    selectedTemplate.length > 0 &&
    script.trim().length > 0 &&
    genState.kind !== "running";

  const generate = useCallback(async () => {
    cancelRef.current = false;
    setAudioBlobs([]);
    setMergedBlob(null);
    if (!chunks.length) return;
    const collected: Blob[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelRef.current) throw new Error("Cancelled");
        const chunk = chunks[i];
        setGenState({
          kind: "running",
          chunkIndex: i + 1,
          chunkCount: chunks.length,
          statusLabel: "submitting",
        });
        const { task_id } = await api.createTask(apiKey, {
          text: chunk.text,
          template_uuid: selectedTemplate,
        });
        await waitForTask(apiKey, task_id, (s) => {
          if (cancelRef.current) return;
          setGenState({
            kind: "running",
            chunkIndex: i + 1,
            chunkCount: chunks.length,
            statusLabel: s,
          });
        });
        if (cancelRef.current) throw new Error("Cancelled");
        setGenState({
          kind: "running",
          chunkIndex: i + 1,
          chunkCount: chunks.length,
          statusLabel: "downloading",
        });
        const res = await api.result(apiKey, task_id);
        const blobs = await extractAudioFromResponse(res);
        collected.push(...blobs);
        setAudioBlobs([...collected]);
      }
      const merged = await concatMp3Blobs(collected);
      setMergedBlob(merged);
      setGenState({ kind: "done", chunkCount: chunks.length });
      refreshAccount();
    } catch (e: unknown) {
      setGenState({
        kind: "error",
        message: (e as Error).message || "Generation failed",
      });
    }
  }, [apiKey, chunks, selectedTemplate, refreshAccount]);

  const cancel = () => {
    cancelRef.current = true;
    setGenState({ kind: "error", message: "Cancelled" });
  };

  const downloadMp3 = async () => {
    const blob =
      mergedBlob || (audioBlobs.length ? await concatMp3Blobs(audioBlobs) : null);
    if (!blob) return;
    downloadBlob(blob, `voice_${Date.now()}.mp3`);
  };

  const downloadZip = async () => {
    if (!audioBlobs.length) return;
    const zip = await zipBlobs(audioBlobs);
    downloadBlob(zip, `voice_${Date.now()}.zip`);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header credits={credits} />
      <div className="flex-1 flex min-h-0">
        <Sidebar
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          templates={templates}
          templatesLoading={templatesLoading}
          templatesError={templatesError}
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          onRefreshTemplates={refreshAccount}
          onOpenLibrary={() => setLibraryOpen(true)}
          libraryCount={library.length}
        />
        <main className="flex-1 flex flex-col gap-3 p-4 min-w-0">
          <ScriptEditor
            value={script}
            onChange={setScript}
            chunkCount={chunks.length}
          />
          {mergedBlob && <AudioPlayer blob={mergedBlob} />}
          <GenerateBar
            disabled={!canGenerate}
            onGenerate={generate}
            onCancel={cancel}
            onDownloadMp3={downloadMp3}
            onDownloadZip={downloadZip}
            state={genState}
            hasAudio={audioBlobs.length > 0}
          />
        </main>
      </div>
      <PronunciationLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        entries={library}
        onChange={setLibrary}
        apiKey={apiKey}
        templates={templates}
        selectedTemplate={selectedTemplate}
      />
    </div>
  );
}
