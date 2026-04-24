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

// MPEG1 Layer III bitrate table (kbps), indexed by the 4-bit bitrate index.
const MPEG1_L3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
// MPEG2 / MPEG2.5 Layer III bitrate table (kbps).
const MPEG2_L3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
// Sample rates (Hz) per MPEG version id.
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG1
  2: [22050, 24000, 16000], // MPEG2
  0: [11025, 12000, 8000], // MPEG2.5
};

function hasId3v2(bytes: Uint8Array, offset: number): boolean {
  return (
    bytes.length >= offset + 10 &&
    bytes[offset] === 0x49 && // 'I'
    bytes[offset + 1] === 0x44 && // 'D'
    bytes[offset + 2] === 0x33 // '3'
  );
}

// ID3v2 stores its size as a synchsafe integer: 4 bytes of 7 useful bits each.
function readId3v2Size(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset + 6] << 21) |
    (bytes[offset + 7] << 14) |
    (bytes[offset + 8] << 7) |
    bytes[offset + 9]
  );
}

// Find the first MPEG audio frame sync: byte 0xFF followed by byte with top 3 bits set.
function findFrameSync(bytes: Uint8Array, from: number, to: number): number {
  for (let i = from; i < to - 1; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) return i;
  }
  return -1;
}

// Compute the byte length of an MPEG Layer III frame from its 4-byte header.
// Returns 0 if the header is invalid or uses a layer/codec we don't recognize.
function parseLayer3FrameSize(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) return 0;
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  const versionId = (b1 >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5, 1=reserved
  const layer = (b1 >> 1) & 0x03; // 1=Layer III
  const bitrateIdx = (b2 >> 4) & 0x0f;
  const sampleRateIdx = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;
  if (
    versionId === 1 ||
    layer !== 1 ||
    bitrateIdx === 0 ||
    bitrateIdx === 15 ||
    sampleRateIdx === 3
  ) {
    return 0;
  }
  const isMpeg1 = versionId === 3;
  const bitrate =
    (isMpeg1 ? MPEG1_L3_BITRATES[bitrateIdx] : MPEG2_L3_BITRATES[bitrateIdx]) *
    1000;
  const sampleRate = SAMPLE_RATES[versionId]?.[sampleRateIdx];
  if (!bitrate || !sampleRate) return 0;
  // Layer III frame size: 144*br/sr (MPEG1) or 72*br/sr (MPEG2/2.5), plus padding.
  const mult = isMpeg1 ? 144 : 72;
  return Math.floor((mult * bitrate) / sampleRate) + padding;
}

// A Xing or Info tag inside the first frame marks it as a metadata-only frame
// (encoder info + total-frame count). We check the first ~40 bytes after the
// header where the tag always lives across all common encoder configurations.
function isXingOrInfoFrame(
  bytes: Uint8Array,
  frameStart: number,
  frameSize: number
): boolean {
  const scanEnd = Math.min(frameStart + Math.min(frameSize, 64), bytes.length - 3);
  for (let i = frameStart + 4; i < scanEnd; i++) {
    const c0 = bytes[i];
    const c1 = bytes[i + 1];
    const c2 = bytes[i + 2];
    const c3 = bytes[i + 3];
    // 'Xing' = 58 69 6E 67   |   'Info' = 49 6E 66 6F
    if (
      (c0 === 0x58 && c1 === 0x69 && c2 === 0x6e && c3 === 0x67) ||
      (c0 === 0x49 && c1 === 0x6e && c2 === 0x66 && c3 === 0x6f)
    ) {
      return true;
    }
  }
  return false;
}

// Strip all non-audio bytes from an MP3 buffer:
//   - leading ID3v2 tag
//   - trailing ID3v1 tag (last 128 bytes starting with 'TAG')
//   - the first frame if it is a Xing/Info metadata frame (its duration counter
//     would lie about the merged file's length and cause players to stop early)
//
// If no valid MPEG frame sync is found the buffer is returned untouched, so
// stitching never throws even if the TTS backend hands back an unexpected codec.
export function stripMp3Metadata(buffer: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(buffer);
  let start = 0;
  let end = bytes.length;

  if (hasId3v2(bytes, 0)) {
    start = 10 + readId3v2Size(bytes, 0);
  }

  if (
    end - start >= 128 &&
    bytes[end - 128] === 0x54 && // 'T'
    bytes[end - 127] === 0x41 && // 'A'
    bytes[end - 126] === 0x47 // 'G'
  ) {
    end -= 128;
  }

  const frameStart = findFrameSync(bytes, start, end);
  if (frameStart === -1) return bytes.slice(start, end);

  const frameSize = parseLayer3FrameSize(bytes, frameStart);
  if (frameSize > 0 && isXingOrInfoFrame(bytes, frameStart, frameSize)) {
    start = frameStart + frameSize;
  } else {
    start = frameStart;
  }

  return bytes.slice(start, end);
}

export async function concatMp3Blobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) return new Blob([], { type: "audio/mpeg" });
  if (blobs.length === 1) return blobs[0];
  const buffers = await Promise.all(blobs.map((b) => b.arrayBuffer()));
  // Strip ID3 tags and Xing/Info metadata frames from every chunk before
  // concatenation. Without this, the merged file inherits the first chunk's
  // Xing duration counter and players stop after only that chunk plays.
  // Cast to BlobPart[] to satisfy TS' strict Uint8Array<ArrayBufferLike>
  // generic; Uint8Array is a valid BlobPart at runtime.
  const cleaned = buffers.map((b) => stripMp3Metadata(b)) as BlobPart[];
  return new Blob(cleaned, { type: "audio/mpeg" });
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
