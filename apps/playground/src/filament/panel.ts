import { defineResource, definePanel } from '@filamentjs/panels';
import { postsModel, postsForm, postsTableConfig } from './resources/posts';
import { usersModel, usersForm, usersTableConfig } from './resources/users';

export const panel = definePanel({
  basePath: '/admin',
  brand: 'FilamentJS',
  navGroups: ['Content', 'Access'],
  resources: [
    defineResource({
      name: 'Post',
      slug: 'posts',
      model: postsModel,
      form: postsForm,
      table: postsTableConfig,
      nav: { group: 'Content', sort: 1 },
    }),
    defineResource({
      name: 'User',
      slug: 'users',
      model: usersModel,
      form: usersForm,
      table: usersTableConfig,
      nav: { group: 'Access', sort: 1 },
      roles: ['admin'],
    }),
  ],
});
