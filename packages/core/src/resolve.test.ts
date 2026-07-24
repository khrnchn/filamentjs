import { describe, it, expect } from 'vitest';
import { resolveProp, isNodeVisible } from './resolve.js';
import { createStore, createCtx } from './state.js';

const ctxWith = (v: Record<string, unknown>) => createCtx(createStore(v));

describe('resolveProp', () => {
  it('returns a literal unchanged', () => {
    expect(resolveProp('hello', ctxWith({}), 'fb')).toBe('hello');
  });
  it('calls a function prop with ctx', () => {
    const ctx = ctxWith({ active: true });
    expect(resolveProp((c) => c.get('active'), ctx, false)).toBe(true);
  });
  it('returns fallback when undefined', () => {
    expect(resolveProp<number>(undefined, ctxWith({}), 42)).toBe(42);
  });
});

describe('isNodeVisible', () => {
  it('defaults to visible', () => {
    expect(isNodeVisible({ type: 'text' }, ctxWith({}))).toBe(true);
  });
  it('resolves a visibility predicate', () => {
    const ctx = ctxWith({ active: false });
    const node = { type: 'text', visible: (c: { get(p: string): unknown }) => c.get('active') === true };
    expect(isNodeVisible(node, ctx)).toBe(false);
  });
});
