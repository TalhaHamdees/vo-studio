"use client";
import { useEffect, useState } from "react";

export function AudioPlayer({ blob }: { blob: Blob | null }) {
  // URL must be created and revoked inside the SAME useEffect so the lifecycle
  // is paired correctly under React 18 Strict Mode (mount -> unmount -> mount).
  // Using useMemo here would let the cleanup revoke a URL that the next render
  // still references, leaving the audio element with a dead blob: src and a
  // Play button that silently does nothing.
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  if (!url) return null;
  return (
    <div className="panel p-3">
      <audio src={url} controls className="w-full" />
    </div>
  );
}
