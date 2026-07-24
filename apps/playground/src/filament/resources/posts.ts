import { buildTable, t } from '@filamentjs/tables';
import { f } from '@filamentjs/forms';
import { posts } from '~/db/schema';

export const postsModel = posts;

export const postsForm = [
  f.text('title').label('Title').required().maxLength(255),
  f.text('slug').label('Slug').required().maxLength(255),
  f.textarea('body').label('Body'),
  f.select('status').label('Status').options({ draft: 'Draft', published: 'Published' }).default('draft'),
  f.toggle('published').label('Published').default(false),
];

export const postsTableConfig = buildTable({
  columns: [
    t.text('title').sortable().searchable(),
    t.text('slug').searchable(),
    t.badge('status'),
    t.boolean('published').sortable(),
  ],
  filters: [
    t.select('status').options({ draft: 'Draft', published: 'Published' }),
    t.ternary('published'),
  ],
  actions: [t.editAction(), t.deleteAction()],
  headerActions: [t.createAction()],
});
