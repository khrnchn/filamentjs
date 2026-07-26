import { f } from '@filamentjs/forms';
import { t } from '@filamentjs/tables';
import { i } from '@filamentjs/infolists';
import type {
  ResourceInput,
  Resource,
  ResourceAction,
  Fields,
  Columns,
  Entries,
  RelationManager,
} from './types.js';

export function defineResource<Model, Relations = unknown, Actions = unknown>(
  input: ResourceInput<Model, Relations, Actions>,
): Resource<Model> {
  return {
    name: input.name,
    pluralName: input.pluralName ?? input.name + 's',
    slug: input.slug,
    model: input.model,
    relations: (input.relations ?? {}) as Record<string, unknown>,
    form: typeof input.form === 'function' ? input.form(f as Fields<Model, Relations>) : input.form,
    table:
      typeof input.table === 'function'
        ? input.table(t as unknown as Columns<Model, Relations, Actions>)
        : input.table,
    infolist:
      typeof input.infolist === 'function'
        ? input.infolist(i as Entries<Model, Relations>)
        : (input.infolist ?? []),
    actions: (input.actions ?? {}) as Record<string, ResourceAction<Model>>,
    relationManagers: (input.relationManagers ?? []).map((manager) => ({
      ...manager,
      table:
        typeof manager.table === 'function'
          ? manager.table(t as unknown as Columns<unknown>)
          : manager.table,
      form:
        typeof manager.form === 'function'
          ? manager.form(f as Fields<unknown>)
          : (manager.form ?? []),
    })) as RelationManager[],
    nav: input.nav ?? {},
    roles: input.roles ?? [],
    can: input.can ?? {},
  };
}
