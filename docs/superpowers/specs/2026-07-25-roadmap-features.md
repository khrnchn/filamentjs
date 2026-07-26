# FilamentJS Roadmap Features Spec (post-v1)

Four features beyond the v1 spec, prioritized by leverage, plus a hardening backlog from the Codex review of the logic packages. Each feature gets its own implementation plan later; this is the design.

Order: **#1 type-safe binding** and **#4 authz** first (differentiator + security), then **#2 relationships** (biggest real-world gap), then **#3 error/toast/pending UX** (feel finished).

---

## 1. Type-safe field ↔ model binding

**Problem:** Today `f.text('titel')` or `t.text('authr')` is a runtime typo, the field name is a bare string unchecked against the Drizzle model. This is the whole reason to build in TypeScript; PHP Filament cannot do it.

**Design:** Make the builder factories generic over the model's column names, inferred from the Drizzle table type.

```ts
type Columns<M> = keyof M['_']['columns'] & string;   // drizzle table -> column-name union

function formFor<M extends AnyPgTable>(model: M) {
  return {
    text: (name: Columns<M>) => new TextFieldBuilder('text', name),
    // ...
  };
}
// usage: const f = formFor(posts); f.text('titel')  // compile error
```

- `defineResource` binds the model and exposes model-scoped `f` and `t` to the `form`/`table` closures: `form: (f) => [...]`, `table: (t) => ({...})`, where `f`/`t` are already typed to the model's columns.
- Dot-path relation columns (`author.name`) need the relations type too; phase this in with feature #2.
- Keeps the runtime builders unchanged; this is a pure type-layer overlay. The pure packages stay model-agnostic; the typed factory lives in `panels` (or a thin `@filamentjs/drizzle` binding).

**Effort:** Medium. Risk: Drizzle's column-type introspection generics can get gnarly; validate against drizzle-orm 0.45 first.

**Shipped.** `defineResource` accepts `form: (f) => [...]` / `table: (t) => buildTable({...})` closures; the factories handed in are the runtime `f`/`t`, retyped so every single-string-arg factory takes only the model's column names. Column names come from a structural `M['_']['columns']` infer (no drizzle dependency in the packages); a non-Drizzle model falls back to `string`. Arrays/`TableConfig` values are still accepted. Compile-time coverage: `packages/panels/src/typed.type-test.ts` (run by `tsc --noEmit`, not vitest).

---

## 2. Relationship fields + relation columns

**Problem:** Real admin panels constantly need "pick the author for this post" (belongsTo) and columns that show `author.name`. The table query resolver currently only handles top-level columns; dot-path relation columns are not joined.

**Design:**
- **Relation column (read):** `t.text('author.name')` resolves via a Drizzle relational query. Resource declares relations (or we read Drizzle's `relations()`); the resolver uses `db.query.<table>.findMany({ with: { author: { columns: { name: true } } }, ... })` and `resolveColumnValue` walks the dot path on the nested result (already supported by `getPath`).
- **Relation field (write):** a `relationSelect` field type: `f.relationSelect('authorId').relatedTo(users, { label: 'name' })`. At spec-resolve time the server loads options (`select id,label from related limit N` or searchable async). Stores the FK scalar.
- Filtering/sorting on relation columns: requires joins; start with read-only relation columns + FK-scalar relation selects, defer relation sorting/filtering.

**Effort:** Medium-High. Needs Drizzle relational-query wiring and an options-loading contract for the select.

**Shipped.**
- **Read:** a resource declares `relations: { author: user }`; any dot-path column makes `resolveQuery` group the paths into a `with` clause and read through `db.query.<key>.findMany`, falling back to the flat select when there are none. The list route resolves cells with `resolveColumnValue`, so `author.name` walks the nested row. One level deep.
- **Write:** `f.relationSelect('authorId').relatedTo(user, { label: 'name' })` stores the FK scalar and validates as a single non-empty string. The pure packages never query: `resolveSchema` only carries `options`, and the playground loads them from the related table (100 rows, ordered by label) after resolving, so the `model` reference never crosses the wire.
- **Typing:** declared relations widen the accepted names to `` `${relation}.${column}` ``, still checked against the related model, so `author.nick` and `editor.name` are compile errors and dot paths stay rejected when no relations are declared.
- Relation columns are read-only: search, filters and sort skip them (sorting on one is ignored rather than fatal).

**Still open:** sorting/filtering on relation columns (needs joins), searchable relation selects for large tables (currently a 100-row option list).

---

## 3. Mutation error surfacing + toasts + pending UI

**Problem:** Save failures (DB constraint, server error) and loading states have no UX. Field-level Zod errors already round-trip; server/unknown errors and pending feedback do not.

**Design:**
- **Toasts:** a lightweight toaster (sonner, or a tiny in-house context). Server fns return `{ ok:false, error }` for non-field failures; routes surface it as a toast. Success actions (created/updated/deleted) toast confirmation.
- **Pending UI:** use TanStack Router `useRouterState({ select: s => s.isLoading })` and form `isSubmitting` state to disable buttons and show spinners. List navigation (sort/search/page) shows a subtle loading bar.
- **Error boundary:** an `/admin` route `errorComponent` so a thrown server error renders a recoverable panel, not a white screen.

**Effort:** Low-Medium. Mostly wiring; one small dependency (sonner) or a ~40-line toaster.

**Shipped.**
- **Toasts:** an in-house provider at the app root (no dependency). Create/update/delete confirm on success; non-field failures toast as errors.
- **Error surfacing:** `saveResource`/`deleteResource` no longer let driver errors escape as thrown server-fn failures. They catch, log server-side, and map SQLSTATE to a safe message (`23505` taken, `23503` still referenced, `23502` missing), because the raw Drizzle message embeds the whole failing query. Field-level Zod errors still render inline as before.
- **Pending UI:** the form disables Save and shows `Saving...` while a submit is in flight; row delete shows `Deleting...` and disables itself.
- Form responses now carry the resource name, so headings read "New Post" / "Edit Post" and toasts name the record.

---

## 4. Server-side authorization on mutations

**Status:** Bootstrapped in the panel-integration plan, every generic server fn checks the session and the resource's `roles`. This spec records the fuller model to finish later.

**Design (full):**
- **Policy per resource+action:** `defineResource({ ..., can: { view, create, update, delete } })` where each is `(ctx: { user, record? }) => boolean`. Server fns evaluate the relevant policy before the operation; loaders evaluate `view`; the UI hides actions the policy denies (defense in depth, server is authoritative).
- **Record-level:** `update`/`delete` policies receive the loaded record, enabling "authors edit only their own posts".
- **Roles vs policies:** `roles: ['admin']` stays as the coarse gate (checked first, cheap); `can.*` is the fine-grained per-record layer.
- better-auth admin plugin remains the role source (`session.user.role`).

**Effort:** Low (roles already in; policies are additive closures checked in the same server fns).

**Shipped (server side).** `defineResource({ can: { view, create, update, delete } })`, each `(ctx: { user, record? }) => boolean`, with `record` typed as the model's row. `authorizeResource(resource, action, ctx)` in `@filamentjs/panels` checks roles first, then the policy (missing policy = allowed). Every playground server fn goes through one gate that loads the record when an id is present, so `update`/`delete` are record-level and a missing row is reported before the mutation. Verified against the running app: an `editor` can create posts but gets `unauthorized` on delete (`can.delete` = admins only) and on the admin-only users resource.

**Still open:** hiding denied actions in the UI. Row actions need a per-row policy evaluation plumbed into the list response; the server stays authoritative in the meantime.

---

## 5. Agent-friendly CLI (`@filamentjs/cli`)

**Problem:** People increasingly hand setup to AI agents. Onboarding must be one non-interactive command, not a curl + psql ritual. Filament has `php artisan make:filament-user`; we need the same ergonomics, but scriptable.

**Shipped now (playground, via Make):**
- `make user EMAIL=.. PASSWORD=.. ROLE=admin` (and `USER_*` env vars), a headless user creator using a cookie-plugin-free better-auth instance. See `apps/playground/scripts/make-user.ts`.
- `make setup` / `make start`, onboard from a fresh clone: install, bring up Postgres in Docker, push schema, seed an admin, optionally run the dev server.

**Full design (publishable `@filamentjs/cli`):** when FilamentJS is installed as a package, a `filament` binary with:
- `filament init`, scaffold `docker-compose.yml` (Postgres), `.env`, the Drizzle config, an `auth.ts`, and a starter panel into the consumer's project. Bring up the compose stack and push the schema in one step.
- `filament make:user`, non-interactive user creation (flags + env), what the Make target does today.
- `filament make:resource <name>`, scaffold a resource file (model binding, form, table stubs).
- `filament start`, compose up + migrate + dev, the packaged version of `make start`.

Every command must be non-interactive by default (flags/env), print machine-readable results, and use real exit codes, so an agent can drive the whole setup without prompts.

**Effort:** Medium. The commands exist in spirit as Make targets; packaging them into a `bin` with project scaffolding is the work.

---

## Hardening backlog (from Codex review of core/forms/tables)

Fix opportunistically; most are edge cases not hit by current usage.

| Sev | Where | Issue | Status |
|---|---|---|---|
| High | `core/path.ts setPath` | Prototype pollution via `__proto__`/`constructor`/`prototype` keys | **Fixed**, such paths are refused |
| Med | `core/path.ts getPath` | Reads inherited props (`toString`) | **Fixed**, `Object.hasOwn` before descending |
| Med | `forms/schema.ts dehydrate` | Hidden/invisible fields still emitted (contradicts spec lifecycle) | **Fixed**, dehydrate walks with a ctx and skips hidden nodes and their children |
| Med | `forms/validation.ts` | `multiSelect().required()` accepts `[]` | **Fixed**, required array fields get `.min(1)` |
| Med | `core/state.ts` + `forms/schema.ts` | Object/array values stored/hydrated by reference (aliasing) | **Fixed**, `hydrate` clones object values (`createStore` already cloned) |
| Med | `forms/schema.ts` | Dotted form field names read flat but ctx reads nested (`author.name`) | Open, reconcile once feature #2 introduces dotted names |
| Low | `tables/resolve-spec.ts` | Structurally-typed action with a `handler` fn could leak into spec | **Fixed**, actions rebuilt from whitelisted keys |
| Low | `tables/resolve-value.ts humanizeLabel` | `HTTPStatus` / trailing-dot edge cases | Open, acceptable; revisit if noisy |
| Low | builders (all) | `build()` returns the live mutable node | **Fixed**, `build()` returns a shallow copy |

Note: `false`/`0`/`''`/`null` are handled correctly through hydrate/dehydrate and validation; those were verified clean.

---

## Sequencing

```
v1 panel ──► #1 typed binding ──► #4 policies ──► #2 relationships ──► #3 UX polish
   done            done              done              done               done
                                    │
                        hardening backlog folded in opportunistically (all but 2 items done)
```

Remaining from this spec: `@filamentjs/cli` packaging (#5, Make targets exist), relation sorting/filtering,
searchable relation selects, per-row action hiding in the UI, and the two open hardening rows.
Each feature ships as its own spec-derived plan, built and tested the same way as the v1 packages.
