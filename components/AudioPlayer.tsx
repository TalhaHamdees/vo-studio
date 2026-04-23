"use client";
import { useEffect, useMemo } from "react";

export function AudioPlayer({ blob }: { blob: Blob | null }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  if (!url) return null;
  return (
    <div className="panel p-3">
      <audio src={url} controls className="w-full" />
    </div>
  );
}
