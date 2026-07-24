import { describe, it, expect } from 'vitest';
import { resolveColumnValue, humanizeLabel } from './resolve-value.js';

describe('resolveColumnValue', () => {
  it('reads a top-level attribute', () => {
    expect(resolveColumnValue({ title: 'Hi' }, { type: 'text', name: 'title' })).toBe('Hi');
  });
  it('walks a dot path into a relation', () => {
    expect(resolveColumnValue({ author: { name: 'Ada' } }, { type: 'text', name: 'author.name' })).toBe('Ada');
  });
  it('prefers an accessor when present', () => {
    const col = { type: 'text' as const, name: 'title', accessor: (r: Record<string, unknown>) => `#${String(r.id)}` };
    expect(resolveColumnValue({ id: 7, title: 'x' }, col)).toBe('#7');
  });
});

describe('humanizeLabel', () => {
  it('title-cases a simple name', () => {
    expect(humanizeLabel('title')).toBe('Title');
  });
  it('splits camelCase', () => {
    expect(humanizeLabel('firstName')).toBe('First Name');
  });
  it('splits snake_case', () => {
    expect(humanizeLabel('created_at')).toBe('Created At');
  });
  it('uses the last dot segment', () => {
    expect(humanizeLabel('author.fullName')).toBe('Full Name');
  });
});
