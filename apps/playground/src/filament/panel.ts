import { definePanel } from '@filamentjs/panels';
import { postsResource } from './resources/posts';
import { usersResource } from './resources/users';

export const panel = definePanel({
  basePath: '/admin',
  brand: 'FilamentJS',
  navGroups: ['Content', 'Access'],
  resources: [postsResource, usersResource],
});
