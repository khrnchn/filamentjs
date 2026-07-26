import { definePanel } from '@filamentjs/panels';
import { postsResource } from './resources/posts';
import { usersResource } from './resources/users';
import { postsCountWidget, usersCountWidget, postsPerDayWidget } from './widgets';

export const panel = definePanel({
  basePath: '/admin',
  brand: 'FilamentJS',
  navGroups: ['Content', 'Access'],
  resources: [postsResource, usersResource],
  widgets: [postsCountWidget, usersCountWidget, postsPerDayWidget],
});
