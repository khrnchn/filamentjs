import type { Ctx, Prop, SchemaNode } from './types.js';

export function resolveProp<T>(prop: Prop<T> | undefined, ctx: Ctx, fallback: T): T {
  if (prop === undefined) return fallback;
  if (typeof prop === 'function') return (prop as (ctx: Ctx) => T)(ctx);
  return prop;
}

export function isNodeVisible(node: SchemaNode, ctx: Ctx): boolean {
  return resolveProp(node.visible, ctx, true);
}
