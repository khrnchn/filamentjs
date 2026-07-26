import { f } from '@filamentjs/forms';
import { t } from '@filamentjs/tables';
import { i } from '@filamentjs/infolists';
import type { ResourceInput, Resource, Fields, Columns, Entries } from './types.js';

export function defineResource<Model, Relations = unknown>(
  input: ResourceInput<Model, Relations>,
): Resource<Model> {
  return {
    name: input.name,
    pluralName: input.pluralName ?? input.name + 's',
    slug: input.slug,
    model: input.model,
    relations: (input.relations ?? {}) as Record<string, unknown>,
    form: typeof input.form === 'function' ? input.form(f as Fields<Model, Relations>) : input.form,
    table: typeof input.table === 'function' ? input.table(t as Columns<Model, Relations>) : input.table,
    infolist:
      typeof input.infolist === 'function'
        ? input.infolist(i as Entries<Model, Relations>)
        : (input.infolist ?? []),
    nav: input.nav ?? {},
    roles: input.roles ?? [],
    can: input.can ?? {},
  };
}
