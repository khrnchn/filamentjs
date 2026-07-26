// Compile-time tests for model-scoped field/column names. Checked by `tsc --noEmit`,
// not by vitest (which strips types).
import { pgTable, text, boolean } from 'drizzle-orm/pg-core';
import { buildTable } from '@filamentjs/tables';
import { defineResource } from './resource.js';

const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  published: boolean('published').notNull(),
});

defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  form: (f) => [
    f.text('title').required(),
    f.toggle('published'),
    f.section('Meta', [f.text('id')]),
    // @ts-expect-error 'titel' is not a column of posts
    f.text('titel'),
  ],
  table: (t) =>
    buildTable({
      columns: [
        t.text('title').sortable(),
        t.boolean('published'),
        // @ts-expect-error 'titel' is not a column of posts
        t.text('titel'),
      ],
      filters: [
        t.ternary('published'),
        // @ts-expect-error 'publshed' is not a column of posts
        t.ternary('publshed'),
      ],
      actions: [t.editAction()],
    }),
});

// Policies get the model's row type.
defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  form: [],
  table: (t) => buildTable({ columns: [t.text('title')] }),
  can: {
    view: ({ user }) => user.role === 'admin',
    update: ({ user, record }) => record?.id === user.id,
    // @ts-expect-error 'ownerId' is not a column of posts
    delete: ({ record }) => record?.ownerId != null,
  },
});

// A plain (non-Drizzle) model keeps names unconstrained.
defineResource({
  name: 'Thing',
  slug: 'things',
  model: {},
  form: (f) => [f.text('anything')],
  table: (t) => buildTable({ columns: [t.text('anything')] }),
});
