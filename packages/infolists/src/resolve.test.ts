import { describe, it, expect } from 'vitest';
import { i } from './factory.js';
import { resolveInfolist } from './resolve.js';

const build = (builders: ReturnType<typeof i.text>[]) => builders.map((b) => b.build());

describe('resolveInfolist', () => {
  it('reads a top-level value by name', () => {
    const spec = resolveInfolist(build([i.text('title')]), { title: 'Hello' });
    expect(spec).toEqual([
      { type: 'text', name: 'title', label: 'Title', value: 'Hello', visible: true },
    ]);
  });

  it('reads a relation dot path', () => {
    const spec = resolveInfolist(build([i.text('author.name')]), { author: { name: 'Ada' } });
    expect(spec[0]?.value).toBe('Ada');
  });

  it('humanizes the last dot segment for the label', () => {
    const spec = resolveInfolist(build([i.text('author.name'), i.text('publishedAt')]), {});
    expect(spec[0]?.label).toBe('Name');
    expect(spec[1]?.label).toBe('Published At');
  });

  it('keeps an explicit label', () => {
    const spec = resolveInfolist(build([i.text('author.name').label('Written by')]), {});
    expect(spec[0]?.label).toBe('Written by');
  });

  it('resolves a label function against the record', () => {
    const spec = resolveInfolist(
      build([i.text('title').label((ctx) => `Title of ${String(ctx.get('slug'))}`)]),
      { slug: 'a-post' },
    );
    expect(spec[0]?.label).toBe('Title of a-post');
  });

  it('falls back to the placeholder when the value is null or missing', () => {
    const spec = resolveInfolist(
      build([i.text('title').placeholder('Untitled'), i.text('body').placeholder('Empty')]),
      { title: null },
    );
    expect(spec[0]?.value).toBe('Untitled');
    expect(spec[1]?.value).toBe('Empty');
  });

  it('resolves a missing value to null when there is no placeholder', () => {
    const spec = resolveInfolist(build([i.text('title')]), { title: null });
    expect(spec[0]?.value).toBeNull();
  });

  it('passes falsy but present values through unchanged', () => {
    const spec = resolveInfolist(
      build([
        i.boolean('published').placeholder('n/a'),
        i.text('views').placeholder('n/a'),
        i.text('subtitle').placeholder('n/a'),
      ]),
      { published: false, views: 0, subtitle: '' },
    );
    expect(spec.map((e) => e.value)).toEqual([false, 0, '']);
  });

  it('omits entries whose visible prop resolves false', () => {
    const spec = resolveInfolist(
      build([
        i.text('title'),
        i.text('reason').visible(false),
        i.text('note').visible((ctx) => ctx.get('status') === 'rejected'),
      ]),
      { title: 'Hello', status: 'draft' },
    );
    expect(spec.map((e) => e.name)).toEqual(['title']);
    expect(spec.every((e) => e.visible)).toBe(true);
  });

  it('recurses into section and grid children', () => {
    const spec = resolveInfolist(
      [
        i
          .section('Details', [i.grid(2, [i.text('title'), i.text('author.name').visible(false)])])
          .build(),
      ],
      { title: 'Hello', author: { name: 'Ada' } },
    );
    expect(spec).toEqual([
      {
        type: 'section',
        heading: 'Details',
        value: null,
        visible: true,
        children: [
          {
            type: 'grid',
            columns: 2,
            value: null,
            visible: true,
            children: [{ type: 'text', name: 'title', label: 'Title', value: 'Hello', visible: true }],
          },
        ],
      },
    ]);
  });

  it('carries badge colors to the resolved entry', () => {
    const spec = resolveInfolist(
      [i.badge('status').colors({ draft: 'gray', published: 'green' }).build()],
      { status: 'published' },
    );
    expect(spec[0]).toEqual({
      type: 'badge',
      name: 'status',
      label: 'Status',
      value: 'published',
      visible: true,
      colors: { draft: 'gray', published: 'green' },
    });
  });

  it('stringifies a value that is not a primitive', () => {
    const date = new Date('2026-07-26T00:00:00.000Z');
    const spec = resolveInfolist(build([i.dateTime('createdAt')]), { createdAt: date });
    expect(spec[0]?.value).toBe(date.toISOString());
  });

  it('is serializable', () => {
    const spec = resolveInfolist(
      [i.section('Details', [i.text('title').visible(() => true)]).build()],
      { title: 'Hello' },
    );
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
  });
});
