import { defineResource } from '@filamentjs/panels';
import { buildTable } from '@filamentjs/tables';
import { posts, user } from '~/db/schema';

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
  table: (t) =>
    buildTable({
      columns: [
        t.text('title').sortable().searchable(),
        t.text('slug').searchable(),
        t.badge('status'),
        t.text('author.name').label('Author'),
        t.boolean('published').sortable(),
      ],
      filters: [
        t.select('status').options({ draft: 'Draft', published: 'Published' }),
        t.ternary('published'),
      ],
      actions: [t.viewAction(), t.editAction(), t.deleteAction()],
      bulkActions: [t.deleteBulkAction()],
      headerActions: [t.createAction()],
    }),
});
