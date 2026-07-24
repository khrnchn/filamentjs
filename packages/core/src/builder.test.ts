import { describe, it, expect } from 'vitest';
import { NodeBuilder } from './builder.js';
import type { SchemaNode } from './types.js';

describe('NodeBuilder', () => {
  it('builds a node with the given type', () => {
    const node = new NodeBuilder<SchemaNode>('text').build();
    expect(node).toEqual({ type: 'text' });
  });
  it('accumulates chained props', () => {
    const pred = () => true;
    const node = new NodeBuilder<SchemaNode>('text').visible(pred).columnSpan(2).build();
    expect(node.visible).toBe(pred);
    expect(node.columnSpan).toBe(2);
  });
  it('returns this for chaining', () => {
    const b = new NodeBuilder<SchemaNode>('text');
    expect(b.disabled(true)).toBe(b);
  });
});
