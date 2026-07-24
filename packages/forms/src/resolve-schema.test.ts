import { describe, it, expect } from 'vitest';
import { f } from './factory.js';
import { buildSchema } from './schema.js';
import { resolveSchema } from './resolve-schema.js';

describe('resolveSchema', () => {
  it('resolves literal props to concrete values', () => {
    const nodes = buildSchema([f.text('name').label('Name').placeholder('Enter name')]);
    const [spec] = resolveSchema(nodes, {});
    expect(spec).toMatchObject({
      type: 'text',
      name: 'name',
      label: 'Name',
      placeholder: 'Enter name',
      visible: true,
      disabled: false,
    });
  });
  it('resolves a visibility function against state', () => {
    const nodes = buildSchema([
      f.text('bio').visible((c) => c.get('active') === true),
    ]);
    expect(resolveSchema(nodes, { active: false })[0]!.visible).toBe(false);
    expect(resolveSchema(nodes, { active: true })[0]!.visible).toBe(true);
  });
  it('emits no functions in the output (serializable)', () => {
    const nodes = buildSchema([f.text('bio').visible(() => true).disabled(() => true)]);
    const spec = resolveSchema(nodes, {});
    expect(JSON.stringify(spec)).toContain('"bio"');
    expect(typeof spec[0]!.visible).toBe('boolean');
    expect(typeof spec[0]!.disabled).toBe('boolean');
  });
  it('recurses into layout children and carries heading/columns', () => {
    const nodes = buildSchema([f.section('Profile', [f.grid(2, [f.text('a')])])]);
    const [section] = resolveSchema(nodes, {});
    expect(section).toMatchObject({ type: 'section', heading: 'Profile' });
    expect(section!.children?.[0]).toMatchObject({ type: 'grid', columns: 2 });
    expect(section!.children?.[0]!.children?.[0]).toMatchObject({ type: 'text', name: 'a' });
  });
  it('passes field options and rules through', () => {
    const nodes = buildSchema([f.select('role').options({ admin: 'Admin' }).required()]);
    const [spec] = resolveSchema(nodes, {});
    expect(spec!.options).toEqual({ admin: 'Admin' });
    expect(spec!.rules).toEqual([{ name: 'required' }]);
  });
});
