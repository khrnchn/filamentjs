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

---

## 2. Relationship fields + relation columns

**Problem:** Real admin panels constantly need "pick the author for this post" (belongsTo) and columns that show `author.name`. The table query resolver currently only handles top-level columns; dot-path relation columns are not joined.

**Design:**
- **Relation column (read):** `t.text('author.name')` resolves via a Drizzle relational query. Resource declares relations (or we read Drizzle's `relations()`); the resolver uses `db.query.<table>.findMany({ with: { author: { columns: { name: true } } }, ... })` and `resolveColumnValue` walks the dot path on the nested result (already supported by `getPath`).
- **Relation field (write):** a `relationSelect` field type: `f.relationSelect('authorId').relatedTo(users, { label: 'name' })`. At spec-resolve time the server loads options (`select id,label from related limit N` or searchable async). Stores the FK scalar.
- Filtering/sorting on relation columns: requires joins; start with read-only relation columns + FK-scalar relation selects, defer relation sorting/filtering.

**Effort:** Medium-High. Needs Drizzle relational-query wiring and an options-loading contract for the select.

---

## 3. Mutation error surfacing + toasts + pending UI

**Problem:** Save failures (DB constraint, server error) and loading states have no UX. Field-level Zod errors already round-trip; server/unknown errors and pending feedback do not.

**Design:**
- **Toasts:** a lightweight toaster (sonner, or a tiny in-house context). Server fns return `{ ok:false, error }` for non-field failures; routes surface it as a toast. Success actions (created/updated/deleted) toast confirmation.
- **Pending UI:** use TanStack Router `useRouterState({ select: s => s.isLoading })` and form `isSubmitting` state to disable buttons and show spinners. List navigation (sort/search/page) shows a subtle loading bar.
- **Error boundary:** an `/admin` route `errorComponent` so a thrown server error renders a recoverable panel, not a white screen.

**Effort:** Low-Medium. Mostly wiring; one small dependency (sonner) or a ~40-line toaster.

---

## 4. Server-side authorization on mutations

**Status:** Bootstrapped in the panel-integration plan, every generic server fn checks the session and the resource's `roles`. This spec records the fuller model to finish later.

**Design (full):**
- **Policy per resource+action:** `defineResource({ ..., can: { view, create, update, delete } })` where each is `(ctx: { user, record? }) => boolean`. Server fns evaluate the relevant policy before the operation; loaders evaluate `view`; the UI hides actions the policy denies (defense in depth, server is authoritative).
- **Record-level:** `update`/`delete` policies receive the loaded record, enabling "authors edit only their own posts".
- **Roles vs policies:** `roles: ['admin']` stays as the coarse gate (checked first, cheap); `can.*` is the fine-grained per-record layer.
- better-auth admin plugin remains the role source (`session.user.role`).

**Effort:** Low (roles already in; policies are additive closures checked in the same server fns).

---

## Hardening backlog (from Codex review of core/forms/tables)

Fix opportunistically; most are edge cases not hit by current usage.

| Sev | Where | Issue | Fix |
|---|---|---|---|
| High | `core/path.ts setPath` | Prototype pollution via `__proto__`/`constructor`/`prototype` keys | Reject/skip those segment names |
| Med | `core/path.ts getPath` | Reads inherited props (`toString`) | Use `Object.hasOwn` before descending |
| Med | `forms/schema.ts dehydrate` | Hidden/invisible fields still emitted (contradicts spec lifecycle) | Skip nodes failing `isNodeVisible` during dehydrate |
| Med | `forms/validation.ts` | `multiSelect().required()` accepts `[]` | Add `.min(1)` to required array fields |
| Med | `core/state.ts` + `forms/schema.ts` | Object/array values stored/hydrated by reference (aliasing) | Clone on set/hydrate, or document the contract |
| Med | `forms/schema.ts` | Dotted form field names read flat but ctx reads nested (`author.name`) | Reconcile once feature #2 introduces dotted names |
| Low | `tables/resolve-spec.ts` | Structurally-typed action with a `handler` fn could leak into spec | Whitelist serializable action keys |
| Low | `tables/resolve-value.ts humanizeLabel` | `HTTPStatus` / trailing-dot edge cases | Acceptable; revisit if noisy |
| Low | builders (all) | `build()` returns the live mutable node | Return a shallow copy from `build()` |

Note: `false`/`0`/`''`/`null` are handled correctly through hydrate/dehydrate and validation; those were verified clean.

---

## Sequencing

```
v1 panel (in progress) ──► #1 typed binding ──► #4 policies ──► #2 relationships ──► #3 UX polish
                                    │
                        hardening backlog folded in opportunistically
```
Each feature ships as its own spec-derived plan, built and tested the same way as the v1 packages.
