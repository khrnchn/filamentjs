import { createCtx, createStore, getPath, isNodeVisible, resolveProp } from '@filamentjs/core';
import type { Ctx, SchemaNode } from '@filamentjs/core';
import type { InfolistEntryNode, InfolistLayoutNode, ResolvedEntry } from './types.js';

function humanizeLabel(name: string): string {
  const last = name.split('.').pop() ?? name;
  return last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function resolveInfolist(
  nodes: SchemaNode[],
  record: Record<string, unknown>,
): ResolvedEntry[] {
  const ctx = createCtx(createStore(record), record);
  return resolveNodes(nodes, record, ctx);
}

// Invisible entries are dropped rather than flagged: an infolist is read-only, so a
// hidden entry has nothing the client could later reveal.
function resolveNodes(
  nodes: SchemaNode[],
  record: Record<string, unknown>,
  ctx: Ctx,
): ResolvedEntry[] {
  const out: ResolvedEntry[] = [];

  for (const node of nodes) {
    if (!isNodeVisible(node, ctx)) continue;

    const entry = node as InfolistEntryNode;
    const layout = node as InfolistLayoutNode;
    const resolved: ResolvedEntry = { type: node.type, value: null, visible: true };

    if (typeof entry.name === 'string') {
      resolved.name = entry.name;
      const raw = getPath(record, entry.name);
      if (raw === null || raw === undefined) {
        resolved.value = entry.placeholder ?? null;
      } else if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        resolved.value = raw;
      } else if (raw instanceof Date) {
        resolved.value = raw.toISOString();
      } else {
        resolved.value = String(raw);
      }
      resolved.label = resolveProp(entry.label, ctx, undefined as unknown as string) ?? humanizeLabel(entry.name);
    } else {
      const label = resolveProp(entry.label, ctx, undefined as unknown as string);
      if (label !== undefined) resolved.label = label;
    }

    if (entry.colors) resolved.colors = entry.colors;
    if (layout.heading !== undefined) resolved.heading = layout.heading;
    if (layout.columns !== undefined) resolved.columns = layout.columns;
    if (node.children) resolved.children = resolveNodes(node.children, record, ctx);

    out.push(resolved);
  }

  return out;
}
