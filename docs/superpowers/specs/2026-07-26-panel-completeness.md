# Panel Completeness Spec (features 1 to 8)

Eight features that take the panel from "CRUD works" to "a real admin panel", ranked by leverage.
Grounded in a read of the Filament v4 monorepo (`packages/{forms,schemas,tables,panels,widgets,infolists}`)
against our current surface.

The first two are not new features, they close gaps between what the config already expresses and what
the UI actually does. Everything after that is new capability.

Each feature below gets its own implementation plan under `docs/superpowers/plans/`. This spec locks the
interfaces so those plans can be written and executed independently.

---

## Global constraints

Apply to every feature here.

- `@filamentjs/core`, `forms`, `tables`, `panels` stay pure: no React, no database, no framework imports.
  Anything that queries lives in `apps/playground/src/server/`.
- Nothing non-serializable may reach a resolved spec. Handlers, Drizzle models and closures stay server-side.
- The server is authoritative for authorization. UI hiding is cosmetic and always mirrored by a server check.
- Typed binding must keep working: every new name-taking builder factory takes `Names<Model, Relations>`,
  so it narrows to the model's columns and declared relation paths.
- TDD. Unit tests next to the source as `*.test.ts` (`npx vitest run packages/<pkg>`), DB-backed tests in
  `apps/playground/src/server/*.test.ts` against the real Postgres (`npx vitest run` inside `apps/playground`).
- Compile-time behaviour is tested in `packages/panels/src/typed.type-test.ts` via `@ts-expect-error`, checked
  by `tsc --noEmit`, not by vitest.
- No em dashes in code, comments, docs or commit messages.
- Commit per task.

---

## 1. Make `live()` real (reactive fields)

**Problem.** `resolveSchema` runs once in `getResourceForm` and the client renders that frozen spec forever.
`f.text('reason').visible((ctx) => ctx.get('status') === 'rejected')` is evaluated against the initial values
and never again, and the `live` flag is carried into the spec and consumed by nobody. Dependent fields, the
whole point of `prop | (ctx) => prop`, do not work.

**Design.** Copy Filament's round trip. When a field marked `live()` changes, the client posts the current
values and swaps in a freshly resolved spec. Local input state is never replaced, only the spec is.

New server fn in `apps/playground/src/server/resource-fns.ts`:

```ts
export const resolveForm = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id?: string; values: Record<string, FormCell> }) => input)
  .handler(async ({ data }): Promise<FormResponse> => { /* gate, then re-resolve with data.values */ });
```

It reuses the same gate as `getResourceForm` (`authorize(slug, id ? 'update' : 'create', id)`) so a live
round trip cannot become an authorization hole.

`getResourceForm` and `resolveForm` share one helper, extracted from the current inline body:

```ts
// resource-fns.ts, server only
async function buildFormResponse(
  resource: Resource,
  record: Record<string, unknown> | undefined,
  values: Record<string, FormCell>,
): Promise<FormResponse>   // resolveSchema + relation option loading, returns { title, spec, values }
```

`FormRenderer` gains one prop and one piece of state:

```ts
interface FormRendererProps {
  spec: ResolvedNode[];
  initialValues: Record<string, unknown>;
  errors?: Record<string, string>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onLiveChange?: (values: Record<string, unknown>) => Promise<ResolvedNode[]>;
}
```

- `setValue` checks the changed node's `live` flag; if set, it calls `onLiveChange` with the new values.
- Requests are debounced 300ms and sequence-numbered; a response older than the newest request is dropped,
  so a slow round trip cannot clobber a newer spec.
- While a live request is in flight the form stays fully interactive. No focus loss: values live in client
  state, only `spec` is replaced.

**Files.** Modify `apps/playground/src/server/resource-fns.ts`, `apps/playground/src/filament/form-renderer.tsx`,
`apps/playground/src/routes/admin/$resource_.new.tsx`, `apps/playground/src/routes/admin/$resource_.$id.edit.tsx`.
Playground demo: give `posts` a live field pair, for example `f.select('status').live()` plus
`f.textarea('rejectionReason').visible((ctx) => ctx.get('status') === 'rejected')`.

**Tests.** `packages/forms/src/resolve-schema.test.ts`: a visible closure reading `ctx.get` flips with the
values passed to `resolveSchema` (proves the pure layer). Playground: a DB-backed test asserting
`resolveForm` returns a spec whose dependent node is visible for one values payload and hidden for another.

**Effort.** Medium. **Risk.** Debounce plus stale-response ordering is the only subtle part.

**Done when.** Changing a live select in the running app shows and hides a dependent field without a reload,
and a stale in-flight response cannot overwrite a newer spec.

---

## 2. Render the table spec (filters, actions, bulk, policy-aware)

**Problem.** `spec.filters`, `spec.actions`, `spec.headerActions` and `spec.bulkActions` are all resolved and
sent to the client, and the list route ignores every one of them: New, Edit and Delete are hardcoded, no
filter UI exists, `deleteBulkAction` has no row selection to act on, and `columnSearches` is declared in
`TableParams` and referenced nowhere. The README already advertises filters and row actions as working.

**Design.**

- **Filters.** Render `spec.filters` above the table. `select` becomes a dropdown of its `options`, `ternary`
  becomes an All / Yes / No / Blank control. Values live in the URL so a filtered list is linkable and the
  loader stays the source of truth. Search param encoding: `filter_<name>=<value>`, `col_<name>=<term>`,
  `perPage=<n>`. `validateSearch` in `apps/playground/src/routes/admin/$resource.tsx` parses them into
  `TableParams.filters` and `TableParams.columnSearches`. Active filters render as removable chips.
- **Column searches.** `resolveQuery` grows a loop mirroring the existing global-search loop, ANDing one
  `ilike` per entry in `params.columnSearches` for columns that exist and are `searchable`. Relation dot
  paths are skipped, same rule as sort and search today.
- **Actions from the spec.** Row actions render from `spec.actions` (`edit` links to the edit route, `delete`
  calls `deleteResource`), header actions from `spec.headerActions` (`create` links to the new route). No
  hardcoded buttons remain.
- **Bulk actions.** A checkbox column plus a select-all-on-page checkbox, an action bar showing the selected
  count, and `deleteBulk` wired to a new server fn:

```ts
export const deleteResources = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; ids: string[] }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; deleted: number; error?: string }> => { /* ... */ });
```

  It evaluates the `delete` policy per record and deletes only the permitted ones, reporting the count. A
  partial result is a success with a smaller `deleted` number, not an error.
- **Policy-aware UI.** `ListResponse` gains a parallel array so the client can hide what the server would
  refuse. Parallel array, not a field on the row, so row data stays exactly the record shape:

```ts
export interface ListResponse {
  title: string;
  rows: Record<string, Cell>[];
  permissions: Array<{ update: boolean; delete: boolean }>;   // index-aligned with rows
  total: number;
  spec: TableSpec;
}
```

  `listResource` fills it by calling `authorizeResource(resource, 'update' | 'delete', { user, record })` per
  row. Header `create` is hidden the same way with a record-less check.

**Files.** Modify `apps/playground/src/routes/admin/$resource.tsx`, `apps/playground/src/server/resolve-query.ts`,
`apps/playground/src/server/resource-fns.ts`, `apps/playground/src/server/resolve-query.test.ts`. Update
`README.md` (its feature claims and the stale "78 tests" count).

**Tests.** `resolve-query.test.ts`: a `columnSearches` entry narrows results, an unknown or relation column in
`columnSearches` is ignored rather than throwing. Playground DB test: `deleteResources` deletes only the
records the policy allows and reports the count.

**Effort.** Medium. **Risk.** Low, all server pieces already exist.

**Done when.** Posts can be filtered by status and by published state from the UI, rows can be multi-selected
and bulk deleted, every button on the page comes from the spec, and a non-admin sees no Delete control on
posts (matching the policy the server already enforces).

---

## 3. View page and infolists

**Problem.** Filament generates four pages per resource (list, create, edit, view). We generate three. There
is no read-only presentation layer, so "show me this record" means opening the edit form.

**Design.** A new pure package `@filamentjs/infolists`, the read-only twin of forms. Entries are formatters
over an already-fetched record, so this is the cheapest genuinely new capability we have.

```ts
// packages/infolists/src/types.ts
export interface InfolistEntryNode extends SchemaNode {
  name?: string;
  label?: Prop<string>;
  placeholder?: string;                 // shown when the value is null or empty
  format?: 'text' | 'badge' | 'boolean' | 'date' | 'dateTime' | 'image' | 'code';
  colors?: Record<string, string>;
  children?: InfolistEntryNode[];
}

export interface ResolvedEntry {
  type: string;
  name?: string;
  label?: string;
  value: string | number | boolean | null;
  visible: boolean;
  heading?: string;
  columns?: number;
  colors?: Record<string, string>;
  children?: ResolvedEntry[];
}

// packages/infolists/src/factory.ts
export const i = {
  text: (name: string) => new EntryBuilder('text', name),
  badge: (name: string) => new BadgeEntryBuilder('badge', name),
  boolean: (name: string) => new EntryBuilder('boolean', name),
  date: (name: string) => new EntryBuilder('date', name),
  dateTime: (name: string) => new EntryBuilder('dateTime', name),
  image: (name: string) => new EntryBuilder('image', name),
  code: (name: string) => new EntryBuilder('code', name),
  section: (heading: string, children: AnyBuilder[]) => new SectionBuilder(heading, children),
  grid: (columns: number, children: AnyBuilder[]) => new GridBuilder(columns, children),
};

// packages/infolists/src/resolve.ts
export function resolveInfolist(
  nodes: SchemaNode[],
  record: Record<string, unknown>,
): ResolvedEntry[];        // walks dot paths with getPath, so author.name works
```

Entry names accept relation paths, so `i.text('author.name')` reads the same nested shape the table resolver
already produces.

Resource wiring in `packages/panels/src/types.ts`:

```ts
infolist?: AnyBuilder[] | ((i: Entries<Model, Relations>) => AnyBuilder[]);
```

`Entries<Model, Relations>` is the same `ScopedNames` treatment already applied to `Fields` and `Columns`.
When a resource declares no infolist, the view page falls back to rendering the form fields read-only, so
every resource gets a usable view page for free.

Server fn plus route:

```ts
export const getResourceView = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ title: string; spec: ResolvedEntry[] }> => { /* gate 'view' */ });
```

Route `apps/playground/src/routes/admin/$resource_.$id.tsx`, linked from a `view` row action, with an Edit
button in its header.

**Files.** Create `packages/infolists/{package.json,tsconfig.json,tsup.config.ts}` and
`packages/infolists/src/{types,entries,factory,resolve,index}.ts` plus tests. Create
`apps/playground/src/filament/infolist-renderer.tsx` and `apps/playground/src/routes/admin/$resource_.$id.tsx`.
Modify `packages/panels/src/{types,resource}.ts`, `packages/tables/src/{types,actions,factory}.ts` (a
`viewAction`), `apps/playground/src/server/resource-fns.ts`, `apps/playground/src/filament/resources/posts.ts`.

**Tests.** `resolve.test.ts`: dot-path values resolve, a null value falls back to `placeholder`, invisible
entries are omitted, badge colors survive. Panels: a resource with no infolist still returns a view spec.

**Effort.** Low to medium. **Risk.** Low.

**Done when.** `/admin/posts/<id>` renders a read-only record including `author.name`, gated by the `view`
policy, and a resource with no declared infolist still gets a working page.

---

## 4. Custom actions with server handlers and modals

**Problem.** `ActionNode.type` is a closed enum: `edit | delete | create | deleteBulk | custom`, and only the
first four do anything. Filament's real power is that an action can be anything, optionally collecting input
in a modal first. We cannot express "Archive", "Send invoice", "Reset password".

**Design.** Handlers cannot serialize, so the resource holds them server-side and the table refers to them by
name. The spec carries only the descriptor.

```ts
// packages/panels/src/types.ts
export interface ActionContext<Model = unknown> {
  user: PolicyUser;
  records: RowOf<Model>[];              // one entry for a row action, many for a bulk action
  values: Record<string, unknown>;      // modal form values, empty object when there is no modal
}

export interface ActionResult {
  ok: boolean;
  message?: string;                     // toasted on success
  error?: string;                       // toasted on failure
}

export interface ResourceAction<Model = unknown> {
  label: string;
  icon?: string;
  destructive?: boolean;
  requiresConfirmation?: boolean;
  bulk?: boolean;                       // may run against a selection
  modal?: AnyBuilder[] | ((f: Fields<Model>) => AnyBuilder[]);   // collected before the handler runs
  can?(ctx: PolicyContext<Model>): boolean;
  handler(ctx: ActionContext<Model>): Promise<ActionResult>;
}

// on ResourceInput
actions?: Record<string, ResourceAction<Model>>;
```

The table refers to one by name, and the name is typed against the declared keys:

```ts
t.action('archive')        // narrowed against keyof ResourceInput['actions']
```

Built with `t.action` only, no separate `t.bulkAction`: placement in `actions` versus `bulkActions`
already says whether it runs per row or over a selection, so the second factory would be redundant.

Runner:

```ts
export const runResourceAction = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; action: string; ids: string[]; values: Record<string, FormCell> }) => input)
  .handler(async ({ data }): Promise<ActionResult> => { /* ... */ });
```

Order of checks, all server-side: resource exists, session exists, roles gate, the action's own `can` per
record, then load the records, validate `values` against the modal schema with the existing
`compileValidation`, then call the handler. A handler that throws becomes `{ ok: false, error }` through the
same `databaseMessage` mapping used by save and delete.

`resolveTableSpec` already rebuilds actions from whitelisted keys, so it needs one more pass to carry
`label`, `icon`, `destructive`, `requiresConfirmation` and `hasModal: boolean` for custom actions. The modal
schema is fetched on demand by a `getActionForm({ slug, action })` server fn, so a list page does not pay for
modals it never opens.

**Files.** Modify `packages/tables/src/{types,actions,factory,resolve-spec}.ts`,
`packages/panels/src/{types,resource,authorize}.ts`, `apps/playground/src/server/resource-fns.ts`,
`apps/playground/src/routes/admin/$resource.tsx`, `apps/playground/src/filament/resources/posts.ts` (an
`archive` action as the demo). Create `apps/playground/src/components/action-modal.tsx`.

**Tests.** Panels: `authorizeResource` composition with an action-level `can`; a named action that does not
exist is rejected at `defineResource` time. Tables: the spec for a custom action carries the descriptor and
never the handler (assert `JSON.stringify(spec)` has no `handler`). Playground DB test: running `archive`
against ids the policy denies performs no write.

**Effort.** Medium to high. **Risk.** The name-to-handler indirection must stay type-safe or it becomes
stringly typed, which is exactly what we are trying to avoid.

**Done when.** A posts row has an Archive action that opens a modal, collects a reason, writes it, toasts the
result, and refuses ids the policy denies even when called directly over HTTP.

---

## 5. Dashboard and widgets

**Problem.** `/admin` has no landing page and the panel has no aggregate view. Filament's dashboard is the
first thing anyone sees.

**Design.** Widgets are config objects with a server-side `load`, exactly like resources.

```ts
// packages/panels/src/types.ts
export interface WidgetContext { user: PolicyUser }

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

// on PanelInput
widgets?: Widget[];
```

`definePanel` sorts widgets and exposes `panel.widgets`. One server fn loads them all, skipping any whose
`roles` the user fails:

```ts
export const loadWidgets = createServerFn({ method: 'GET' })
  .handler(async (): Promise<Array<{ name: string; title: string; type: string; chart?: string;
    columnSpan: number; data: unknown }>> => { /* ... */ });
```

Route `apps/playground/src/routes/admin/index.tsx` renders a 4-column grid: stats as cards, charts through
Recharts (client-only import, the one new dependency). Widget failures are isolated: a rejected `load`
renders that card in an error state instead of failing the page.

**Files.** Create `packages/panels/src/widget.ts` plus tests, `apps/playground/src/routes/admin/index.tsx`,
`apps/playground/src/components/widget-grid.tsx`, `apps/playground/src/filament/widgets.ts` (posts count,
users count, posts per day chart). Modify `packages/panels/src/{types,panel}.ts`,
`apps/playground/src/server/resource-fns.ts`, `apps/playground/package.json` (recharts).

**Tests.** Panels: widgets sort by declaration order, `roles` filtering picks the right subset, `columnSpan`
defaults to 1. Playground DB test: the posts-count widget returns the real row count.

**Effort.** Low to medium. **Risk.** Low.

**Done when.** `/admin` shows live counts and one chart from the real database, and a widget whose `load`
throws degrades to a single broken card.

---

## 6. Relation managers

**Problem.** We can pick a parent (belongsTo, shipped in feature 2 of the roadmap spec) but cannot manage
children. Editing a post cannot touch its comments. This is the most-wanted real-world feature after
belongsTo.

**Design.** Drizzle does not expose relationship metadata as richly as Eloquent, so the FK is declared
explicitly rather than introspected. That keeps the whole thing typed and removes all guessing.

```ts
// packages/panels/src/types.ts
export interface RelationManager<Related = unknown> {
  slug: string;                                  // tab key and URL segment
  title: string;                                 // tab label
  model: Related;                                // Drizzle table holding the children
  foreignKey: string;                            // column name on the child table pointing at the parent id
  table: TableConfig | ((t: Columns<Related>) => TableConfig);
  form?: AnyBuilder[] | ((f: Fields<Related>) => AnyBuilder[]);
}

// on ResourceInput
relationManagers?: RelationManager[];
```

Server fns mirror the resource ones but take a parent and scope every query by
`eq(childTable[foreignKey], parentId)`:

```ts
listRelated({ slug, id, relation, params })      // -> ListResponse
saveRelated({ slug, id, relation, childId?, values })   // -> SaveResult, injects the FK on create
deleteRelated({ slug, id, relation, childId })   // -> DeleteResult
```

Authorization: every relation operation is gated by the **parent's** `update` policy plus the parent's roles,
evaluated against the loaded parent record. A child is never reachable except through its parent id, so a
forged `childId` belonging to another parent is rejected by the scoped where clause.

UI: tabs under the edit page form, each rendering the existing list table plus an inline create and edit
modal reusing `FormRenderer`.

**Files.** Modify `packages/panels/src/{types,resource}.ts`, `apps/playground/src/server/resource-fns.ts`,
`apps/playground/src/routes/admin/$resource_.$id.edit.tsx`. Create
`apps/playground/src/filament/relation-manager.tsx`, and a `comments` table plus relation in
`apps/playground/src/db/schema.ts` as the demo.

**Tests.** Panels: relation managers normalize with resolved table and form. Playground DB tests:
`listRelated` returns only the parent's children; `saveRelated` injects the FK; `deleteRelated` refuses a
child belonging to a different parent; all three refuse when the parent's `update` policy denies.

**Effort.** High. **Risk.** Scope creep. Attach and detach for many-to-many are explicitly out, one-to-many
only for now.

**Done when.** Editing a post lists its comments in a tab, and comments can be created, edited and deleted
there, with every operation refused when the parent policy denies.

---

## 7. Field depth (nested state, repeater, file upload, and friends)

**Problem.** We have 11 field types against Filament's ~25, and two of the missing ones block real apps:
repeater and file upload. Repeater is blocked by something deeper: form state is a flat
`Record<string, unknown>` keyed by field name, so arrays of objects cannot be represented.

**Design.** Three steps, in order.

**7a. Nested form state (prerequisite).** `hydrate` and `dehydrate` in `packages/forms/src/schema.ts` move
from flat keys to `getPath`/`setPath`, which already handle dot paths and already refuse prototype-polluting
segments. A field named `meta.author` then round-trips as `{ meta: { author } }`. This also closes the open
hardening row "dotted form field names read flat but ctx reads nested". Validation compiles to nested Zod
objects for dotted names. This step is behaviour-preserving for every existing flat field, which is what the
tests must prove.

**7b. Repeater.**

```ts
f.repeater('items', [f.text('label'), f.text('qty')]).minItems(1).maxItems(10).itemLabel('label')
```

Node: `{ type: 'repeater', name, children, minItems?, maxItems?, itemLabel? }`. State is an array of objects.
`resolveSchema` resolves the child schema once as a template plus one resolved copy per existing row, so
per-row `visible` closures see the row's own values through a scoped `ctx`. Validation is
`z.array(z.object(...)).min(minItems).max(maxItems)`. Stored in a Postgres `jsonb` column.

**7c. File upload.**

```ts
f.fileUpload('cover').accept(['image/png', 'image/jpeg']).maxSize(5_000_000)
```

The field stores a relative path string, never the bytes. Upload is its own server fn taking multipart form
data, writing under `apps/playground/uploads/` and returning `{ path }`; a route serves those files back. The
storage location is a single function in playground code so an S3 swap later touches one place.

**7d. Cheap remaining types.** `f.tagsInput` (string array, jsonb), `f.keyValue` (string record, jsonb),
`f.colorPicker`, and upgrading `datePicker` / `dateTimePicker` to native `<input type="date">` and
`datetime-local` (zero dependency) with a real picker component deferred.

**Files.** Modify `packages/forms/src/{types,fields,factory,schema,resolve-schema,validation}.ts`,
`apps/playground/src/filament/form-renderer.tsx`, `apps/playground/src/db/schema.ts`. Create
`apps/playground/src/server/uploads.ts` and `apps/playground/src/routes/uploads.$.tsx`.

**Tests.** Forms: hydrate and dehydrate round-trip a dotted name into nested shape while every existing flat
case is unchanged; repeater validation enforces `minItems` and `maxItems`; a repeater row's `visible` closure
reads that row's values, not the parent's. Playground: an uploaded file lands on disk and the field stores
the path.

**Effort.** Medium per step, 7a first and alone. **Risk.** 7a touches the hydrate and dehydrate contract that
every existing field depends on, so it ships as its own commit with the full suite green.

**Done when.** A post can carry a repeatable list and an uploaded cover image, and every pre-existing flat
field behaves exactly as before.

---

## 8. Table depth

**Problem.** Tables work but feel unfinished next to Filament: no column toggling, one fixed page size, a
bare empty state, no totals.

**Design.** Independent, small, and each shippable on its own.

- **Toggleable columns.** `t.text('slug').toggleable()` and `.toggleable({ hiddenByDefault: true })`. A
  column-manager dropdown writes the hidden set into the URL (`hidden=slug,status`). `resolveTableSpec`
  carries `toggleable` and `hiddenByDefault`.
- **Page size.** `buildTable({ ..., pageSizes: [10, 25, 50, 100] })`, default 10, chosen size in the URL as
  `perPage`. `TableParams.pageSize` already carries it to the resolver.
- **Empty state.** `buildTable({ ..., emptyState: { heading, description, icon } })`, rendered instead of the
  "No records found" string, with the create header action repeated inside it when the policy allows.
- **Summaries.** `t.text('views').summarize('sum')` with `sum | avg | count | min | max`. `resolveQuery` runs
  one extra aggregate select over the same filtered where clause and returns
  `summaries: Record<string, number>` on `TableResult`, rendered as a footer row. Whole-dataset scope only,
  per-page and per-group summaries deferred.
- **Persisted state.** Everything above already lives in the URL, so a filtered, sorted, column-toggled view
  is linkable. Session persistence is explicitly not copied.
- **Grouping** is out of scope here, it interacts with joins and summaries and deserves its own spec.

**Files.** Modify `packages/tables/src/{types,columns,factory,resolve-spec}.ts`,
`apps/playground/src/server/resolve-query.ts`, `apps/playground/src/routes/admin/$resource.tsx`.

**Tests.** Tables: `toggleable` and `hiddenByDefault` reach the spec; `pageSizes` defaults sensibly; a
summarized column carries its aggregate in the spec. Playground DB test: `resolveQuery` returns a correct
`sum` over the filtered set, not the page.

**Effort.** Low to medium per item. **Risk.** Low.

**Done when.** Columns can be hidden, page size changed, an empty resource explains itself, and a numeric
column can show a total, all reflected in the URL.

---

## Status

All eight features are built and verified against the running app. What was deliberately left
undone, or discovered along the way:

- 7d (tags input, key value, colour picker, native date pickers) was scoped out of 7c and remains open.
- Grouping, relation sorting and filtering, searchable relation selects and queue-backed import
  and export remain out of scope, as recorded below.
- `t.bulkAction` was dropped as redundant; see the note under feature 4.
- Two typed-binding interactions surfaced during the build and were fixed by exempting the factory
  from column narrowing: `t.action` takes a handler name, and a repeater's row fields are keys
  inside the stored row rather than model columns.
- Adding the view page briefly made the edit route unreachable, because `$resource_.$id.tsx`
  became the parent of `$resource_.$id.edit.tsx`. The view route is now an index leaf.

## Sequencing

```
1 live()  ──►  2 table spec  ──►  3 view + infolists  ──►  4 custom actions  ──►  5 widgets
                                                                  │
                                              7a nested state ──► 7b repeater ──► 7c uploads
                                                                  │
                                                            6 relation managers  ──►  8 table depth
```

- 1 and 2 first: they make the panel honest about what it already claims.
- 3 before 4: the view page gives custom actions somewhere natural to live.
- 7a before 7b and before 6: nested state is a prerequisite for both repeaters and relation forms.
- 8 last: pure polish, and it benefits from 4's action plumbing for the empty-state action.

## Cross-cutting prerequisites

| Prerequisite | Blocks | Why |
|---|---|---|
| `buildFormResponse` extraction | 1, 4, 6 | One place that resolves a schema and loads relation options |
| Per-row permissions on `ListResponse` | 2, 4, 6 | Any UI that hides an action needs the server's verdict per record |
| Named action registry | 4, 8 | Handlers cannot serialize, so the spec refers to them by name |
| Nested form state (7a) | 7b, 6 | Arrays of objects cannot live in a flat state map |

## Explicitly not copying from Filament

Polymorphic relations (`MorphTo`, `MorphToSelect`), Laravel Scout search, Livewire-specific fields, reflection
based dependency injection into closures (our explicit `ctx` is the better fit), session-persisted table
state, and queue-backed import and export.
