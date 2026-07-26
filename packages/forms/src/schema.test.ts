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
  it('hydrates a dotted field from a nested record into nested state', () => {
    const state = hydrate(buildSchema([f.text('meta.author')]), {
      meta: { author: 'Ada' },
    });
    expect(state).toEqual({ meta: { author: 'Ada' } });
  });
  it('does not alias object values from the record', () => {
    const record = { tags: ['a'] };
    const state = hydrate(buildSchema([f.multiSelect('tags')]), record);
    (state.tags as string[]).push('b');
    expect(record.tags).toEqual(['a']);
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
  it('dehydrates a dotted field into a nested payload', () => {
    const payload = dehydrate(buildSchema([f.text('meta.author')]), {
      meta: { author: 'Ada' },
    });
    expect(payload).toEqual({ meta: { author: 'Ada' } });
  });
  it('preserves flat field hydration and dehydration', () => {
    const nodes = buildSchema([f.text('name')]);
    expect(dehydrate(nodes, hydrate(nodes, { name: 'Ada' }))).toEqual({ name: 'Ada' });
  });
  it('skips fields hidden by their own visible prop', () => {
    const nodes = buildSchema([f.text('name'), f.text('secret').visible(false)]);
    expect(dehydrate(nodes, { name: 'Ada', secret: 'shh' })).toEqual({ name: 'Ada' });
  });
  it('skips a hidden dotted field from the nested payload', () => {
    const nodes = buildSchema([f.text('meta.secret').visible(false)]);
    expect(dehydrate(nodes, { meta: { secret: 'shh' } })).toEqual({});
  });
  it('skips fields inside a hidden layout', () => {
    const nodes = buildSchema([f.section('Meta', [f.text('secret')]).visible(false)]);
    expect(dehydrate(nodes, { secret: 'shh' })).toEqual({});
  });
  it('evaluates visibility against the current values', () => {
    const nodes = buildSchema([
      f.toggle('advanced'),
      f.text('threshold').visible((ctx) => ctx.get('advanced') === true),
    ]);
    expect(dehydrate(nodes, { advanced: false, threshold: '10' })).toEqual({ advanced: false });
    expect(dehydrate(nodes, { advanced: true, threshold: '10' })).toEqual({ advanced: true, threshold: '10' });
  });
});
