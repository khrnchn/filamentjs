import { describe, it, expect } from 'vitest';
import { createStore, createCtx } from './state.js';

describe('createStore', () => {
  it('seeds from initial values', () => {
    const s = createStore({ name: 'Ada' });
    expect(s.get('name')).toBe('Ada');
  });
  it('sets and reads nested paths', () => {
    const s = createStore();
    s.set('author.name', 'Ada');
    expect(s.get('author.name')).toBe('Ada');
    expect(s.values).toEqual({ author: { name: 'Ada' } });
  });
});

describe('createCtx', () => {
  it('delegates get/set to the store', () => {
    const s = createStore({ active: true });
    const ctx = createCtx(s);
    expect(ctx.get('active')).toBe(true);
    ctx.set('active', false);
    expect(s.get('active')).toBe(false);
  });
  it('exposes record and live values', () => {
    const s = createStore({ a: 1 });
    const ctx = createCtx(s, { id: 5 });
    expect(ctx.record).toEqual({ id: 5 });
    expect(ctx.values).toBe(s.values);
  });
});
