import { describe, it, expect } from 'vitest';
import { FieldBuilder, TextFieldBuilder, SelectFieldBuilder } from './fields.js';

describe('FieldBuilder', () => {
  it('builds a field node with type, name, empty rules', () => {
    const node = new FieldBuilder('toggle', 'active').build();
    expect(node).toMatchObject({ type: 'toggle', name: 'active', rules: [] });
  });
  it('accumulates label, default, and required rule', () => {
    const node = new FieldBuilder('toggle', 'active').label('Active').default(true).required().build();
    expect(node.label).toBe('Active');
    expect(node.default).toBe(true);
    expect(node.rules).toEqual([{ name: 'required' }]);
  });
  it('marks a field live', () => {
    expect(new FieldBuilder('toggle', 'active').live().build().live).toBe(true);
  });
});

describe('TextFieldBuilder', () => {
  it('collects text validation rules in order', () => {
    const node = new TextFieldBuilder('text', 'email').required().email().maxLength(255).build();
    expect(node.rules).toEqual([
      { name: 'required' },
      { name: 'email' },
      { name: 'maxLength', value: 255 },
    ]);
  });
  it('adds a unique marker rule', () => {
    expect(new TextFieldBuilder('text', 'email').unique().build().rules).toEqual([{ name: 'unique' }]);
  });
});

describe('SelectFieldBuilder', () => {
  it('stores options', () => {
    const node = new SelectFieldBuilder('select', 'role').options({ admin: 'Admin', user: 'User' }).build();
    expect(node.options).toEqual({ admin: 'Admin', user: 'User' });
  });
});
