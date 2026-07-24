import { getPath } from '@filamentjs/core';
import type { SchemaNode } from '@filamentjs/core';
import type { AnyBuilder } from './layout.js';
import type { FormFieldNode } from './types.js';

export function buildSchema(builders: AnyBuilder[]): SchemaNode[] {
  return builders.map((b) => b.build());
}

function isField(node: SchemaNode): node is FormFieldNode {
  return typeof (node as FormFieldNode).name === 'string';
}

export function collectFields(nodes: SchemaNode[]): FormFieldNode[] {
  const out: FormFieldNode[] = [];
  for (const node of nodes) {
    if (isField(node)) out.push(node);
    if (node.children) out.push(...collectFields(node.children));
  }
  return out;
}

export function hydrate(
  nodes: SchemaNode[],
  record?: Record<string, unknown>,
): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const field of collectFields(nodes)) {
    const fromRecord = record ? getPath(record, field.name) : undefined;
    const value = fromRecord !== undefined ? fromRecord : field.default;
    if (value !== undefined) state[field.name] = value;
  }
  return state;
}

export function dehydrate(
  nodes: SchemaNode[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of collectFields(nodes)) {
    const value = values[field.name];
    if (value !== undefined) payload[field.name] = value;
  }
  return payload;
}
