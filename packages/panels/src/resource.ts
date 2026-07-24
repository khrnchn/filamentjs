import type { ResourceInput, Resource } from './types.js';

export function defineResource<Model>(input: ResourceInput<Model>): Resource<Model> {
  return {
    name: input.name,
    pluralName: input.pluralName ?? input.name + 's',
    slug: input.slug,
    model: input.model,
    form: input.form,
    table: input.table,
    nav: input.nav ?? {},
    roles: input.roles ?? [],
  };
}
