import { describe, it, expect } from 'vitest';
import { f } from './factory.js';
import { buildSchema, collectFields, hydrate, dehydrate } from './schema.js';

const builders = [
  f.text('name').default('Anon'),
  f.section('Profile', [f.toggle('active').default(false), f.text('bio')]),
];

describe('buildSchema', () => {
  it('builds all top-level builders', () => {
    const nodes = buildSchema(builders);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ type: 'text', name: 'name' });
    expect(nodes[1]).toMatchObject({ type: 'section' });
  });
});

describe('collectFields', () => {
  it('collects fields depth-first through layout', () => {
    const names = collectFields(buildSchema(builders)).map((x) => x.name);
    expect(names).toEqual(['name', 'active', 'bio']);
  });
});

describe('hydrate', () => {
  it('uses record values when present, defaults otherwise', () => {
    const state = hydrate(buildSchema(builders), { name: 'Ada' });
    expect(state).toEqual({ name: 'Ada', active: false });
  });
  it('applies defaults with no record', () => {
    expect(hydrate(buildSchema(builders))).toEqual({ name: 'Anon', active: false });
  });
});

describe('dehydrate', () => {
  it('collects current field values, skipping undefined', () => {
    const payload = dehydrate(buildSchema(builders), { name: 'Ada', active: true });
    expect(payload).toEqual({ name: 'Ada', active: true });
  });
});
