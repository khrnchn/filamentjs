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
}

function resolveNode(node: SchemaNode, ctx: Ctx): ResolvedNode {
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

  if (node.children) {
    resolved.children = node.children.map((c) => resolveNode(c, ctx));
  }

  return resolved;
}

export function resolveSchema(
  nodes: SchemaNode[],
  values: Record<string, unknown>,
  record?: Record<string, unknown>,
): ResolvedNode[] {
  const ctx = createCtx(createStore(values), record);
  return nodes.map((n) => resolveNode(n, ctx));
}
