import { defineResource } from '@filamentjs/panels';
import { buildTable } from '@filamentjs/tables';
import { eq } from 'drizzle-orm';
import { db } from '~/db/client';
import { comments, posts, user } from '~/db/schema';

export const postsResource = defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,
  relations: { author: user },
  nav: { group: 'Content', sort: 1 },
  // Anyone signed in can read and write posts; only admins can delete them.
  can: { delete: ({ user }) => user.role === 'admin' },
  form: (f) => [
    f.text('title').label('Title').required().maxLength(255),
    f.text('slug').label('Slug').required().maxLength(255),
    f
      .select('status')
      .label('Status')
      .options({ draft: 'Draft', published: 'Published' })
      .default('draft')
      .live(),
    f.textarea('body').label('Body').visible((ctx) => ctx.get('status') === 'draft'),
    f.relationSelect('authorId').label('Author').relatedTo(user, { label: 'name' }),
    f
      .repeater('links', (row) => [
        row.text('label').label('Label').required(),
        row.text('url').label('URL'),
      ])
      .label('Links')
      .maxItems(5)
      .itemLabel('label'),
    f.toggle('published').label('Published').default(false),
  ],
  infolist: (i) => [
    i.section('Content', [
      i.text('title').label('Title'),
      i.text('slug').label('Slug'),
      i.text('body').label('Body').placeholder('No body yet'),
    ]),
    i.section('Meta', [
      i.grid(2, [
        i.badge('status').label('Status').colors({ draft: 'gray', published: 'green' }),
        i.boolean('published').label('Published'),
        i.text('author.name').label('Author').placeholder('Unassigned'),
        i.dateTime('createdAt').label('Created'),
      ]),
    ]),
  ],
  actions: {
    archive: {
      label: 'Archive',
      requiresConfirmation: true,
      modal: (f) => [f.textarea('body').label('Reason').required().maxLength(200)],
      can: ({ user }) => user.role === 'admin',
      handler: async ({ records, values }) => {
        const reason = String(values.body ?? '');
        for (const record of records) {
          await db
            .update(posts)
            .set({ published: false, status: 'draft', body: `Archived: ${reason}` })
            .where(eq(posts.id, record.id));
        }
        return { ok: true, message: `Archived ${records.length} post${records.length === 1 ? '' : 's'}` };
      },
    },
  },
  relationManagers: [
    {
      slug: 'comments',
      title: 'Comments',
      model: comments,
      foreignKey: 'postId',
      form: (f) => [
        f.text('author').label('Author').required(),
        f.textarea('body').label('Comment').required(),
        f.toggle('approved').label('Approved').default(false),
      ],
      table: (t) =>
        buildTable({
          columns: [
            t.text('author').sortable(),
            t.text('body'),
            t.boolean('approved').sortable(),
            t.text('createdAt').label('Created').sortable(),
          ],
          actions: [t.editAction(), t.deleteAction()],
          headerActions: [t.createAction()],
          pageSizes: [5, 10, 25],
          emptyState: { heading: 'No comments yet' },
        }),
    },
  ],
  table: (t) =>
    buildTable({
      columns: [
        t.text('title').sortable().searchable().summarize('count'),
        t.text('slug').searchable().toggleable(),
        t.badge('status'),
        t.text('author.name').label('Author').toggleable({ hiddenByDefault: true }),
        t.boolean('published').sortable(),
      ],
      pageSizes: [5, 10, 25],
      emptyState: {
        heading: 'No posts match this view',
        description: 'Clear the filters, or create the first post.',
      },
      filters: [
        t.select('status').options({ draft: 'Draft', published: 'Published' }),
        t.ternary('published'),
      ],
      actions: [t.viewAction(), t.editAction(), t.action('archive'), t.deleteAction()],
      bulkActions: [t.deleteBulkAction(), t.action('archive')],
      headerActions: [t.createAction()],
    }),
});
