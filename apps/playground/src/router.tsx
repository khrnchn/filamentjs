import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ErrorPanel } from './components/error-panel';

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: ErrorPanel,
  });
}
