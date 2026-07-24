# FilamentJS Forms Vertical (Create + Edit for Posts)

**Goal:** Add a working create and edit form for the `posts` resource in the playground, dogfooding `@filamentjs/forms` end to end: a `FormRenderer` client component driven by `resolveSchema` output, server functions that validate with the compiled Zod schema and persist via Drizzle, and `/admin/posts/new` + `/admin/posts/$id/edit` routes.

**Reference pattern:** `apps/playground/src/routes/admin/posts.tsx` (the list page) already shows the working shape: a route with a loader calling a `createServerFn`, consuming a package-produced serializable spec, rendering shadcn UI. Mirror it. Read it first.

**Stack facts (already set up, do NOT reinstall):** TanStack Start, `@filamentjs/forms` (exports `f`, `buildSchema`, `hydrate`, `dehydrate`, `resolveSchema`, `compileValidation`, and type `ResolvedNode`), Drizzle client at `~/db/client` (`db`), `posts` table at `~/db/schema`, shadcn primitives in `~/components/ui/` (`button`, `input`), `cn` in `~/lib/utils`. Postgres is running via docker compose.

## Global Constraints

- pnpm v10 (installed). No new dependencies should be needed; if one truly is, STOP and report rather than guessing.
- TypeScript strict. Run `pnpm --filter @filamentjs/playground typecheck` after each task. A `vite build` regenerates `routeTree.gen.ts`, run it before typechecking when you add a route (the route-tree types are stale until then). No `any` in public signatures.
- No em dashes in code/comments/commit messages.
- Commit per task with the exact messages below. Do not push.
- Serializable server-fn returns: TanStack Start rejects `unknown`-typed fields in a server fn's return. Use concrete serializable shapes (see list-posts.ts `Cell` type for the pattern).

---

### Task 1: Add the posts form config + a textarea shadcn primitive

**Files:**
- Create: `apps/playground/src/components/ui/textarea.tsx`
- Modify: `apps/playground/src/filament/resources/posts.ts`

**Interfaces produced:**
- `Textarea` component (mirror `input.tsx`, using a `<textarea>` with the same class string plus `min-h-20`).
- `postsForm` export: an array of form builders describing the posts form.

- [ ] Step 1: Write `textarea.tsx` mirroring `input.tsx` but rendering `<textarea>` with `TextareaHTMLAttributes<HTMLTextAreaElement>` and an added `min-h-20` class.

- [ ] Step 2: Add to `posts.ts`:
```ts
import { f } from '@filamentjs/forms';

export const postsForm = [
  f.text('title').label('Title').required().maxLength(255),
  f.text('slug').label('Slug').required().maxLength(255),
  f.textarea('body').label('Body'),
  f.select('status').label('Status').options({ draft: 'Draft', published: 'Published' }).default('draft'),
  f.toggle('published').label('Published').default(false),
];
```

- [ ] Step 3: `pnpm --filter @filamentjs/playground typecheck` (clean). Commit: `feat(playground): add posts form config and textarea primitive`

---

### Task 2: Form server functions (spec, create, update, load record)

**Files:**
- Create: `apps/playground/src/server/posts-form.ts`

**Interfaces produced:**
- `getPostForm(id?: string)` server fn (GET): returns `{ spec: ResolvedNode[]; values: Record<string, FormCell> }`. When `id` is given, load the record via Drizzle and `hydrate` from it; otherwise hydrate with defaults. `spec` comes from `resolveSchema(buildSchema(postsForm), values)`.
- `savePost({ id?, values })` server fn (POST): builds the schema, runs `compileValidation(schema).safeParse(dehydrate(schema, values))`. On failure return `{ ok: false, errors: Record<string,string> }` (map Zod issues by path). On success insert (no id) or update (id) via Drizzle and return `{ ok: true, id }`.
- `type FormCell = string | number | boolean | null`.

Notes:
- Use `buildSchema(postsForm)` once per handler. `postsForm` from `~/filament/resources/posts`.
- For validation errors: `result.error.issues.forEach(i => errors[String(i.path[0])] = i.message)`.
- For serializability, type `values` as `Record<string, FormCell>`.

- [ ] Step 1: Write the three server fns as described, with exact serializable types.
- [ ] Step 2: `pnpm --filter @filamentjs/playground typecheck` (clean). Commit: `feat(playground): add posts form server functions`

---

### Task 3: FormRenderer client component

**Files:**
- Create: `apps/playground/src/filament/form-renderer.tsx`

**Interfaces produced:**
- `FormRenderer({ spec, initialValues, errors, onSubmit }): JSX` where `spec: ResolvedNode[]`, `initialValues: Record<string, unknown>`, `errors?: Record<string,string>`, `onSubmit: (values: Record<string, unknown>) => void`.
- Tracks `values` in `useState(initialValues)`. Renders each visible node (skip `visible === false`). Field types:
  - `text` -> `Input`
  - `textarea` -> `Textarea`
  - `select` -> native `<select>` styled like Input, options from `node.options`
  - `toggle` / `checkbox` -> `<input type="checkbox">`
  - layout `section` -> a `<fieldset>` with `node.heading` legend, recurse into `node.children`
  - `grid` -> a `<div>` with `grid` + `grid-cols-{columns}`, recurse
- Each field shows `node.label`, binds value to `values[node.name]`, updates on change, and shows `errors[node.name]` in red below when present.
- A submit `Button` calls `onSubmit(values)`.

- [ ] Step 1: Write the component. Recurse for layout nodes. Keep it one file, readable top to bottom.
- [ ] Step 2: `pnpm --filter @filamentjs/playground typecheck` (clean). Commit: `feat(playground): add FormRenderer client component`

---

### Task 4: Create + edit routes

**Files:**
- Create: `apps/playground/src/routes/admin/posts_.new.tsx`
- Create: `apps/playground/src/routes/admin/posts_.$id.edit.tsx`

(The `posts_` prefix opts out of nesting under the `/admin/posts` list layout, giving flat sibling routes `/admin/posts/new` and `/admin/posts/$id/edit`.)

**Behavior:**
- `new`: loader calls `getPostForm()`. Component renders `FormRenderer` with the spec + values, `onSubmit` calls `savePost({ data: { values } })`; on `ok` navigate to `/admin/posts`, else set errors state and re-render.
- `edit`: `params.id`, loader calls `getPostForm(id)`. Same, `savePost({ data: { id, values } })`.
- Wrap each in a `max-w-3xl p-6` container with an `<h1>` (New post / Edit post) and a back `Link` to `/admin/posts`.

- [ ] Step 1: Write both routes.
- [ ] Step 2: `pnpm --filter @filamentjs/playground build` (regenerates route tree), then `typecheck` (clean).
- [ ] Step 3: Wire the list page buttons: in `posts.tsx`, make "New post" a `Link` to `/admin/posts/new`, and add an "Edit" `Link` per row to `/admin/posts/$id/edit` (add an actions cell). Rebuild + typecheck.
- [ ] Step 4: Commit: `feat(playground): add create and edit post routes`

---

### Task 5: End-to-end verification against the running app

- [ ] Step 1: Ensure Postgres is up: `cd apps/playground && docker compose up -d`.
- [ ] Step 2: Start dev server in background: `nohup pnpm dev > /tmp/pg.log 2>&1 &`, wait until `curl -sf localhost:3000/` succeeds.
- [ ] Step 3: Verify the create page renders the form: `curl -sL localhost:3000/admin/posts/new -o /tmp/new.html`; confirm it contains the field labels (Title, Slug, Body, Status, Published) and a submit button. Report the grep results.
- [ ] Step 4: Create a post via the save server fn over HTTP (mimic the client): POST to the server-fn endpoint is complex to hand-craft, so instead verify via the DB after using the UI is not possible headlessly; instead assert the edit page loads an existing record: pick an existing post id via `docker exec filamentjs-pg psql -U filamentjs -d filamentjs -t -c "select id from posts limit 1"`, then `curl -sL "localhost:3000/admin/posts/<id>/edit" -o /tmp/edit.html` and confirm the form is pre-filled with that post's title (grep the title value into an input `value=`).
- [ ] Step 5: Stop the dev server (`kill` the pid on port 3000). Leave Postgres running.
- [ ] Step 6: Report: typecheck output, build output, the two curl grep results, and `git log --oneline -6`.

---

## Self-Review

- Forms package surface exercised: `f` builders (Task 1), `buildSchema`/`hydrate`/`dehydrate`/`compileValidation` (Task 2), `resolveSchema` + `ResolvedNode` (Tasks 2-3). Covered.
- Server-authoritative validation via compiled Zod: Task 2. Covered.
- Fields + layout rendering (section/grid recursion): Task 3. Covered.
- Real create/edit against Postgres: Tasks 4-5. Covered.
- No placeholders: every task states exact files, exact interfaces, exact commit messages. Field-type mapping is explicit.
- Type consistency: `FormCell` defined in Task 2 and used for serializable values; `ResolvedNode` imported from `@filamentjs/forms` in Tasks 2-3; `postsForm` defined in Task 1 and consumed in Task 2.
