import { EMBED_CHUNK_CHARS, EMBED_CHUNK_OVERLAP } from '../config/constants.js';

/** Collapse whitespace and strip common quoted-reply / signature noise so the
 * text we embed and summarise is the substantive content. */
export function cleanEmailText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    // Drop long quoted-reply blocks ("On <date>, <person> wrote:" onward is
    // kept for thread summaries but trimmed for per-message embedding callers
    // that pass already-isolated content).
    .replace(/^[ \t]*>.*$/gm, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Split text into overlapping character windows for embedding. Prefers to
 * break on paragraph/sentence boundaries near the window edge. */
export function chunkText(
  text: string,
  size = EMBED_CHUNK_CHARS,
  overlap = EMBED_CHUNK_OVERLAP,
): string[] {
  const clean = cleanEmailText(text);
  if (clean.length <= size) return clean.length ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      // Try to end on a sentence/paragraph boundary within the last 20%.
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > size * 0.6) end = start + breakAt + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
