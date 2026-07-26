// Field names come from resource definitions but flow through user-submitted form
// values, so paths are treated as untrusted: only own properties are read, and
// prototype-reaching segments are refused outright.
const UNSAFE_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    if (!Object.hasOwn(cur, seg)) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split('.');
  if (segs.some((s) => UNSAFE_SEGMENTS.has(s))) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!;
    const next = cur[seg];
    if (next == null || typeof next !== 'object') {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]!] = value;
}
