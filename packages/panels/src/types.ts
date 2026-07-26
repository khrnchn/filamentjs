import type { AnyBuilder, f } from '@filamentjs/forms';
import type { TableConfig, t } from '@filamentjs/tables';

// Drizzle tables carry their columns at `_['columns']`; anything else stays unconstrained.
type ColumnNames<M> = M extends { _: { columns: infer C } } ? Extract<keyof C, string> : string;

// Narrows every single-string-argument factory (the ones taking a column name) to the
// model's columns. Multi-arg factories (section, grid) and no-arg ones (actions) pass through.
type ScopedNames<T, Names extends string> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? A extends [string]
      ? (name: Names) => R
      : T[K]
    : T[K];
};

export type Fields<Model> = ScopedNames<typeof f, ColumnNames<Model>>;
export type Columns<Model> = ScopedNames<typeof t, ColumnNames<Model>>;

// Drizzle tables expose their row type at `$inferSelect`; a plain model is its own row type.
type RowOf<M> = M extends { $inferSelect: infer R } ? R : M;

export type PolicyAction = 'view' | 'create' | 'update' | 'delete';

export interface PolicyUser {
  id: string;
  role?: string | null;
}

export interface PolicyContext<Model = unknown> {
  user: PolicyUser;
  record?: RowOf<Model>;
}

// `update`/`delete` receive the loaded record, so "authors edit only their own posts"
// is expressible. `view`/`create` are called without one.
// Method syntax on purpose: it keeps the policies bivariant so a `Resource<Post>` still
// fits the panel's model-erased `Resource[]` list.
export interface ResourcePolicies<Model = unknown> {
  view?(ctx: PolicyContext<Model>): boolean;
  create?(ctx: PolicyContext<Model>): boolean;
  update?(ctx: PolicyContext<Model>): boolean;
  delete?(ctx: PolicyContext<Model>): boolean;
}

export interface NavMeta {
  group?: string;
  icon?: string;
  sort?: number;
}

export interface ResourceInput<Model = unknown> {
  name: string;
  pluralName?: string;
  slug: string;
  model: Model;
  form: AnyBuilder[] | ((f: Fields<Model>) => AnyBuilder[]);
  table: TableConfig | ((t: Columns<Model>) => TableConfig);
  nav?: NavMeta;
  roles?: string[];
  can?: ResourcePolicies<Model>;
}

export interface Resource<Model = unknown> {
  name: string;
  pluralName: string;
  slug: string;
  model: Model;
  form: AnyBuilder[];
  table: TableConfig;
  nav: NavMeta;
  roles: string[];
  can: ResourcePolicies<Model>;
}

export interface PanelInput {
  basePath?: string;
  brand?: string;
  resources: Resource[];
  navGroups?: string[];
}

export interface NavItem {
  slug: string;
  label: string;
  href: string;
  icon?: string;
  sort: number;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export interface Panel {
  basePath: string;
  brand: string;
  resources: Resource[];
  nav: NavGroup[];
  getResource(slug: string): Resource | undefined;
}
