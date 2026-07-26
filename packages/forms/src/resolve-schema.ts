import { createCtx, createStore, isNodeVisible, resolveProp } from '@filamentjs/core';
import type { Ctx, SchemaNode } from '@filamentjs/core';
import type { FormFieldNode, LayoutNode, ValidationRule } from './types.js';

export interface ResolvedNode {
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled: boolean;
  visible: boolean;
  heading?: string;
  columns?: number;
  options?: Record<string, string>;
  live?: boolean;
  rules?: ValidationRule[];
  children?: ResolvedNode[];
  // repeater only: one resolved set of nodes per row, names scoped as `field.index.child`
  rows?: ResolvedNode[][];
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
}

function resolveNode(node: SchemaNode, ctx: Ctx, values: Record<string, unknown>): ResolvedNode {
  const field = node as FormFieldNode;
  const layout = node as LayoutNode;

  const resolved: ResolvedNode = {
    type: node.type,
    visible: isNodeVisible(node, ctx),
    disabled: resolveProp(node.disabled, ctx, false),
  };

  if (typeof field.name === 'string') {
    resolved.name = field.name;
    resolved.rules = field.rules;
    if (field.options) resolved.options = field.options;
    if (field.live) resolved.live = true;
    const placeholder = resolveProp(field.placeholder, ctx, undefined as unknown as string);
    if (placeholder !== undefined) resolved.placeholder = placeholder;
    const helperText = resolveProp(field.helperText, ctx, undefined as unknown as string);
    if (helperText !== undefined) resolved.helperText = helperText;
  }

  const label = resolveProp(field.label, ctx, undefined as unknown as string);
  if (label !== undefined) resolved.label = label;

  if (layout.heading !== undefined) resolved.heading = layout.heading;
  if (layout.columns !== undefined) resolved.columns = layout.columns;

  // Each repeater row resolves against its own values, so a closure inside a row sees
  // that row's state rather than the parent's, and every name is scoped to its index.
  if (node.type === 'repeater') {
    const rows = Array.isArray(values[field.name]) ? (values[field.name] as Record<string, unknown>[]) : [];
    if (field.minItems !== undefined) resolved.minItems = field.minItems;
    if (field.maxItems !== undefined) resolved.maxItems = field.maxItems;
    if (field.itemLabel !== undefined) resolved.itemLabel = field.itemLabel;
    resolved.rows = rows.map((row, index) => {
      const rowValues = row ?? {};
      const rowCtx = createCtx(createStore(rowValues), rowValues);
      return (node.children ?? []).map((child) => {
        const childResolved = resolveNode(child, rowCtx, rowValues);
        if (childResolved.name) childResolved.name = `${field.name}.${index}.${childResolved.name}`;
        return childResolved;
      });
    });
    // the unscoped template lets the client build a new row client-side
    resolved.children = (node.children ?? []).map((child) => resolveNode(child, ctx, {}));
    return resolved;
  }

  if (node.children) {
    resolved.children = node.children.map((c) => resolveNode(c, ctx, values));
  }

  return resolved;
}

export function resolveSchema(
  nodes: SchemaNode[],
  values: Record<string, unknown>,
  record?: Record<string, unknown>,
): ResolvedNode[] {
  const ctx = createCtx(createStore(values), record);
  return nodes.map((n) => resolveNode(n, ctx, values));
}
