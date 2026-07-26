import { describe, it, expect } from 'vitest';
import { getPath, setPath } from './path.js';

describe('getPath', () => {
  it('reads a top-level key', () => {
    expect(getPath({ name: 'Ada' }, 'name')).toBe('Ada');
  });
  it('reads a nested key', () => {
    expect(getPath({ author: { name: 'Ada' } }, 'author.name')).toBe('Ada');
  });
  it('returns undefined for a missing segment', () => {
    expect(getPath({ author: {} }, 'author.name')).toBeUndefined();
    expect(getPath({}, 'a.b.c')).toBeUndefined();
  });
  it('does not read inherited properties', () => {
    expect(getPath({}, 'toString')).toBeUndefined();
    expect(getPath({}, 'constructor.name')).toBeUndefined();
  });
});

describe('setPath', () => {
  it('sets a top-level key', () => {
    const o: Record<string, unknown> = {};
    setPath(o, 'name', 'Ada');
    expect(o).toEqual({ name: 'Ada' });
  });
  it('creates intermediate objects', () => {
    const o: Record<string, unknown> = {};
    setPath(o, 'author.name', 'Ada');
    expect(o).toEqual({ author: { name: 'Ada' } });
  });
  it('overwrites an existing value', () => {
    const o: Record<string, unknown> = { author: { name: 'Ada' } };
    setPath(o, 'author.name', 'Grace');
    expect(o).toEqual({ author: { name: 'Grace' } });
  });
  it('ignores prototype-polluting paths', () => {
    const o: Record<string, unknown> = {};
    setPath(o, '__proto__.polluted', 'yes');
    setPath(o, 'constructor.prototype.polluted', 'yes');
    setPath(o, 'prototype', 'yes');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(o).toEqual({});
  });
});
