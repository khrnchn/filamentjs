import { describe, it, expect } from 'vitest';
import { FilterBuilder } from './filters.js';

describe('FilterBuilder', () => {
  it('builds a select filter with options', () => {
    const node = new FilterBuilder('select', 'role').options({ admin: 'Admin' }).build();
    expect(node).toMatchObject({ type: 'select', name: 'role', options: { admin: 'Admin' } });
  });
  it('marks a filter multiple', () => {
    expect(new FilterBuilder('select', 'tags').multiple().build().multiple).toBe(true);
  });
  it('builds a ternary filter', () => {
    expect(new FilterBuilder('ternary', 'active').build()).toEqual({ type: 'ternary', name: 'active' });
  });
});
