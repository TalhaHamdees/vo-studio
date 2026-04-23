import JSZip from "jszip";

export async function extractAudioFromResponse(
  res: Response
): Promise<Blob[]> {
  const ct = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  if (ct.includes("zip") || isZip(buf)) {
    const zip = await JSZip.loadAsync(buf);
    const files = Object.values(zip.files).filter(
      (f) => !f.dir && /\.(mp3|wav|m4a)$/i.test(f.name)
    );
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const blobs: Blob[] = [];
    for (const f of files) {
      const bin = await f.async("arraybuffer");
      blobs.push(new Blob([bin], { type: "audio/mpeg" }));
    }
    return blobs;
  }
  return [new Blob([buf], { type: "audio/mpeg" })];
}

function isZip(buf: ArrayBuffer): boolean {
  const v = new Uint8Array(buf, 0, 4);
  return v[0] === 0x50 && v[1] === 0x4b && (v[2] === 0x03 || v[2] === 0x05);
}

export async function concatMp3Blobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) return new Blob([], { type: "audio/mpeg" });
  if (blobs.length === 1) return blobs[0];
  const buffers = await Promise.all(blobs.map((b) => b.arrayBuffer()));
  return new Blob(buffers, { type: "audio/mpeg" });
}

export async function zipBlobs(blobs: Blob[], prefix = "chunk"): Promise<Blob> {
  const zip = new JSZip();
  const pad = String(blobs.length).length;
  for (let i = 0; i < blobs.length; i++) {
    const n = String(i + 1).padStart(pad, "0");
    zip.file(`${prefix}_${n}.mp3`, await blobs[i].arrayBuffer());
  }
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
