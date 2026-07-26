import { defineResource } from '@filamentjs/panels';
import { buildTable } from '@filamentjs/tables';
import { user } from '~/db/schema';

export const usersResource = defineResource({
  name: 'User',
  slug: 'users',
  model: user,
  nav: { group: 'Access', sort: 1 },
  roles: ['admin'],
  form: (f) => [
    f.text('name').label('Name').required(),
    f.text('email').label('Email').email().required(),
    f.select('role').label('Role').options({ user: 'User', admin: 'Admin' }).default('user'),
  ],
  table: (t) =>
    buildTable({
      columns: [
        t.text('name').sortable().searchable(),
        t.text('email').searchable(),
        t.badge('role'),
        t.boolean('banned'),
      ],
      filters: [t.select('role').options({ user: 'User', admin: 'Admin' })],
      actions: [t.editAction()],
    }),
});
