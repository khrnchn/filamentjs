import { buildTable, t } from '@filamentjs/tables';
import { posts } from '~/db/schema';

export const postsModel = posts;

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
