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
    f.textarea('body').label('Body'),
    f.select('status').label('Status').options({ draft: 'Draft', published: 'Published' }).default('draft'),
    f.relationSelect('authorId').label('Author').relatedTo(user, { label: 'name' }),
    f.toggle('published').label('Published').default(false),
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
      actions: [t.editAction(), t.deleteAction()],
      headerActions: [t.createAction()],
    }),
});
