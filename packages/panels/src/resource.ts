import { f } from '@filamentjs/forms';
import { t } from '@filamentjs/tables';
import type { ResourceInput, Resource, Fields, Columns } from './types.js';

export function defineResource<Model>(input: ResourceInput<Model>): Resource<Model> {
  return {
    name: input.name,
    pluralName: input.pluralName ?? input.name + 's',
    slug: input.slug,
    model: input.model,
    form: typeof input.form === 'function' ? input.form(f as Fields<Model>) : input.form,
    table: typeof input.table === 'function' ? input.table(t as Columns<Model>) : input.table,
    nav: input.nav ?? {},
    roles: input.roles ?? [],
    can: input.can ?? {},
  };
}
