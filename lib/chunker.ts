export interface Chunk {
  index: number;
  text: string;
  length: number;
}

const SENTENCE_END = /([.!?]["')\]]?)(\s+|$)/g;
const PARAGRAPH_BREAK = /\n\s*\n/;

export function splitIntoChunks(
  input: string,
  targetSize = 5000,
  minSize = 2500
): Chunk[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= targetSize) {
    return [{ index: 0, text, length: text.length }];
  }

  const paragraphs = text.split(PARAGRAPH_BREAK).map((p) => p.trim()).filter(Boolean);
  const sentences: string[] = [];
  for (const p of paragraphs) {
    let last = 0;
    let m: RegExpExecArray | null;
    SENTENCE_END.lastIndex = 0;
    while ((m = SENTENCE_END.exec(p)) !== null) {
      const end = m.index + m[1].length;
      sentences.push(p.slice(last, end).trim());
      last = end + m[2].length;
    }
    if (last < p.length) sentences.push(p.slice(last).trim());
    sentences.push("\n\n");
  }

  const chunks: Chunk[] = [];
  let buf = "";
  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push({ index: chunks.length, text: t, length: t.length });
    buf = "";
  };
  for (const s of sentences) {
    if (s === "\n\n") {
      if (buf.length >= minSize) flush();
      else buf += "\n\n";
      continue;
    }
    if (!buf) {
      buf = s;
      continue;
    }
    if (buf.length + 1 + s.length > targetSize) {
      flush();
      buf = s;
    } else {
      buf += " " + s;
    }
  }
  flush();

  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    const prev = chunks[chunks.length - 2];
    if (last.length < minSize && prev.length + last.length < targetSize * 1.3) {
      prev.text = prev.text + " " + last.text;
      prev.length = prev.text.length;
      chunks.pop();
    }
  }
  return chunks.map((c, i) => ({ ...c, index: i }));
}

export function estimateChunks(
  input: string,
  targetSize = 5000,
  minSize = 2500
): number {
  return splitIntoChunks(input, targetSize, minSize).length;
}
