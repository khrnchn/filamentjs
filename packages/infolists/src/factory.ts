import {
  BadgeEntryBuilder,
  EntryBuilder,
  GridBuilder,
  SectionBuilder,
  type AnyBuilder,
} from './entries.js';

export const i = {
  text: (name: string) => new EntryBuilder('text', name),
  badge: (name: string) => new BadgeEntryBuilder('badge', name),
  boolean: (name: string) => new EntryBuilder('boolean', name),
  date: (name: string) => new EntryBuilder('date', name),
  dateTime: (name: string) => new EntryBuilder('dateTime', name),
  image: (name: string) => new EntryBuilder('image', name),
  code: (name: string) => new EntryBuilder('code', name),
  section: (heading: string, children: AnyBuilder[]) => new SectionBuilder(heading, children),
  grid: (columns: number, children: AnyBuilder[]) => new GridBuilder(columns, children),
};
