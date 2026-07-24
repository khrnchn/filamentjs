import { buildTable, t } from '@filamentjs/tables';
import { f } from '@filamentjs/forms';
import { user } from '~/db/schema';

export const usersModel = user;

export const usersForm = [
  f.text('name').label('Name').required(),
  f.text('email').label('Email').email().required(),
  f.select('role').label('Role').options({ user: 'User', admin: 'Admin' }).default('user'),
];

export const usersTableConfig = buildTable({
  columns: [
    t.text('name').sortable().searchable(),
    t.text('email').searchable(),
    t.badge('role'),
    t.boolean('banned'),
  ],
  filters: [t.select('role').options({ user: 'User', admin: 'Admin' })],
  actions: [t.editAction()],
});
