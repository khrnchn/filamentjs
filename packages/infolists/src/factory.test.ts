import { describe, it, expect } from 'vitest';
import { i } from './factory.js';
import { BadgeEntryBuilder, EntryBuilder, GridBuilder, SectionBuilder } from './entries.js';

describe('i', () => {
  it('exposes exactly the documented keys', () => {
    expect(Object.keys(i).sort()).toEqual(
      ['badge', 'boolean', 'code', 'date', 'dateTime', 'grid', 'image', 'section', 'text'].sort(),
    );
  });

  it('builds each entry type with its name', () => {
    for (const type of ['text', 'boolean', 'date', 'dateTime', 'image', 'code'] as const) {
      const builder = i[type]('title');
      expect(builder).toBeInstanceOf(EntryBuilder);
      expect(builder.build()).toEqual({ type, name: 'title' });
    }
  });

  it('badge returns a BadgeEntryBuilder', () => {
    const builder = i.badge('status');
    expect(builder).toBeInstanceOf(BadgeEntryBuilder);
    expect(builder.colors({ draft: 'gray' }).build()).toEqual({
      type: 'badge',
      name: 'status',
      colors: { draft: 'gray' },
    });
  });

  it('section and grid return layout builders', () => {
    expect(i.section('Details', [i.text('title')])).toBeInstanceOf(SectionBuilder);
    expect(i.grid(2, [i.text('title')])).toBeInstanceOf(GridBuilder);
  });
});
