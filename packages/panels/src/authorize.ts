import type { Resource, PolicyAction, PolicyContext } from './types.js';

// Roles are the coarse gate and are checked first; `can.*` is the fine-grained
// (optionally record-level) layer. Missing policy means allowed.
export function authorizeResource<Model>(
  resource: Resource<Model>,
  action: PolicyAction,
  ctx: PolicyContext<Model>,
): boolean {
  if (resource.roles.length && !resource.roles.includes(ctx.user.role ?? '')) return false;
  const policy = resource.can[action];
  return policy ? policy(ctx) : true;
}
