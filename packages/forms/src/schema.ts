import { createCtx, createStore, getPath, isNodeVisible, setPath } from '@filamentjs/core';
import type { SchemaNode } from '@filamentjs/core';
import type { AnyBuilder } from './layout.js';
import type { FormFieldNode } from './types.js';

export function buildSchema(builders: AnyBuilder[]): SchemaNode[] {
  return builders.map((b) => b.build());
}

function isField(node: SchemaNode): node is FormFieldNode {
  return typeof (node as FormFieldNode).name === 'string';
}

// A named node with children (a repeater) owns everything beneath it, so its children
// are a row template rather than fields in their own right. Layout nodes have no name
// and are transparent, so collection carries on through them.
export function collectFields(nodes: SchemaNode[]): FormFieldNode[] {
  const out: FormFieldNode[] = [];
  for (const node of nodes) {
    if (isField(node)) {
      out.push(node);
      continue;
    }
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
    // clone objects/arrays so form state never aliases the record or the field default
    if (value !== undefined) {
      setPath(
        state,
        field.name,
        typeof value === 'object' && value !== null ? structuredClone(value) : value,
      );
    }
  }
  return state;
}

// Hidden fields (and everything under a hidden layout) never reach the payload:
// what the user cannot see, they cannot submit.
export function dehydrate(
  nodes: SchemaNode[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const ctx = createCtx(createStore(values));
  const payload: Record<string, unknown> = {};

  const walk = (list: SchemaNode[]) => {
    for (const node of list) {
      if (!isNodeVisible(node, ctx)) continue;
      if (isField(node)) {
        const value = getPath(values, node.name);
        if (value !== undefined) setPath(payload, node.name, value);
        continue;
      }
      if (node.children) walk(node.children);
    }
  };

  walk(nodes);
  return payload;
}
