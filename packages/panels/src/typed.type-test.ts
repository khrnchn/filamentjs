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

// Declared relations widen the accepted names with `relation.column` paths.
const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  relations: { author: users },
  form: (f) => [f.text('title')],
  table: (t) =>
    buildTable({
      columns: [
        t.text('author.name'),
        // @ts-expect-error 'nick' is not a column of the related users table
        t.text('author.nick'),
        // @ts-expect-error 'editor' is not a declared relation
        t.text('editor.name'),
      ],
    }),
});

// Without a relations declaration, dot paths stay rejected.
defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  form: [],
  // @ts-expect-error no relations declared, so 'author.name' is not a valid column
  table: (t) => buildTable({ columns: [t.text('author.name')] }),
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

// t.action refers to a declared handler by name, checked against the actions map.
defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  form: [],
  actions: {
    archive: {
      label: 'Archive',
      handler: async ({ records, user }) => ({
        ok: records.every((record) => record.title !== '') && user.id !== '',
      }),
    },
  },
  table: (t) =>
    buildTable({
      columns: [t.text('title')],
      actions: [t.action('archive')],
      // @ts-expect-error 'publish' is not a declared action
      bulkActions: [t.action('publish')],
    }),
});

// With no actions declared, any name is accepted rather than none.
defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  form: [],
  table: (t) => buildTable({ columns: [t.text('title')], actions: [t.action('anything')] }),
});

// A plain (non-Drizzle) model keeps names unconstrained.
defineResource({
  name: 'Thing',
  slug: 'things',
  model: {},
  form: (f) => [f.text('anything')],
  table: (t) => buildTable({ columns: [t.text('anything')] }),
});
