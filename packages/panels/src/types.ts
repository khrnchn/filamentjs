import type { AnyBuilder, f } from '@filamentjs/forms';
import type { TableConfig, t } from '@filamentjs/tables';
import type { i } from '@filamentjs/infolists';

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

// Declared relations contribute `relation.column` paths, typed against the related model.
type RelationPaths<Relations> = {
  [K in keyof Relations & string]: `${K}.${ColumnNames<Relations[K]>}`;
}[keyof Relations & string];

type Names<Model, Relations> = ColumnNames<Model> | RelationPaths<Relations>;

// `t.action` takes a handler name, not a column name, so it is exempt from the column
// narrowing above and typed against the resource's declared action keys instead.
type ActionNames<Actions> = [Actions] extends [never]
  ? string
  : keyof Actions extends never
    ? string
    : keyof Actions & string;

export type Fields<Model, Relations = unknown> = ScopedNames<typeof f, Names<Model, Relations>>;
export type Columns<Model, Relations = unknown, Actions = unknown> = Omit<
  ScopedNames<typeof t, Names<Model, Relations>>,
  'action'
> & {
  action(name: ActionNames<Actions>): ReturnType<typeof t.action>;
};
export type Entries<Model, Relations = unknown> = ScopedNames<typeof i, Names<Model, Relations>>;

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

export interface ResourceInput<Model = unknown, Relations = unknown, Actions = unknown> {
  name: string;
  pluralName?: string;
  slug: string;
  model: Model;
  // related models keyed by relation name, as declared in the Drizzle `relations()` call
  relations?: Relations;
  form: AnyBuilder[] | ((f: Fields<Model, Relations>) => AnyBuilder[]);
  table: TableConfig | ((t: Columns<Model, Relations, Actions>) => TableConfig);
  // omit to let the view page fall back to the form fields rendered read-only
  infolist?: AnyBuilder[] | ((i: Entries<Model, Relations>) => AnyBuilder[]);
  // handlers the table refers to by name through t.action(...). The intersection keeps
  // Actions inferring from the literal while still constraining what a handler looks like.
  actions?: Actions & Record<string, ResourceAction<Model>>;
  nav?: NavMeta;
  roles?: string[];
  can?: ResourcePolicies<Model>;
}

export interface Resource<Model = unknown> {
  name: string;
  pluralName: string;
  slug: string;
  model: Model;
  relations: Record<string, unknown>;
  form: AnyBuilder[];
  table: TableConfig;
  infolist: AnyBuilder[];
  actions: Record<string, ResourceAction<Model>>;
  nav: NavMeta;
  roles: string[];
  can: ResourcePolicies<Model>;
}

export interface ActionContext<Model = unknown> {
  user: PolicyUser;
  // one entry for a row action, many for a bulk action
  records: RowOf<Model>[];
  // modal form values, an empty object when the action has no modal
  values: Record<string, unknown>;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

// Handlers cannot serialize, so they stay here on the resource and the table refers
// to them by name. Method syntax keeps these bivariant, like the policies above.
export interface ResourceAction<Model = unknown> {
  label: string;
  icon?: string;
  destructive?: boolean;
  requiresConfirmation?: boolean;
  modal?: AnyBuilder[] | ((f: Fields<Model>) => AnyBuilder[]);
  can?(ctx: PolicyContext<Model>): boolean;
  handler(ctx: ActionContext<Model>): Promise<ActionResult>;
}

export interface WidgetContext {
  user: PolicyUser;
}

export interface StatWidget {
  type: 'stat';
  name: string;
  title: string;
  columnSpan?: number;
  roles?: string[];
  load(ctx: WidgetContext): Promise<{ value: string | number; description?: string; trend?: number[] }>;
}

export interface ChartWidget {
  type: 'chart';
  name: string;
  title: string;
  chart: 'line' | 'bar' | 'pie';
  columnSpan?: number;
  roles?: string[];
  load(ctx: WidgetContext): Promise<{ labels: string[]; series: Array<{ name: string; data: number[] }> }>;
}

export type Widget = StatWidget | ChartWidget;

export interface PanelInput {
  basePath?: string;
  brand?: string;
  resources: Resource[];
  navGroups?: string[];
  widgets?: Widget[];
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
  widgets: Widget[];
  nav: NavGroup[];
  getResource(slug: string): Resource | undefined;
}
