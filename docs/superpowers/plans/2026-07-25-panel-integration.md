# FilamentJS Panel Integration Plan (finish the spec'd panel)

**Goal:** Turn the hand-wired posts pages into a panel-driven admin: a single `definePanel` config drives generic `/admin/$resource` routes (list/create/edit), a shell with sidebar nav + topbar, a better-auth session guard on the whole `/admin` tree, per-resource role authorization enforced server-side on every data/mutation server fn, and a second resource (Users) proving the generalization.

**Reference files to mirror (READ FIRST):**
- `apps/playground/src/routes/admin/posts.tsx` (list route shape)
- `apps/playground/src/routes/admin/posts_.new.tsx`, `posts_.$id.edit.tsx` (create/edit route shape)
- `apps/playground/src/server/list-posts.ts`, `posts-form.ts` (server-fn + serializable `Cell`/`FormCell` patterns)
- `apps/playground/src/filament/form-renderer.tsx` (renderer)
- `apps/playground/src/filament/resources/posts.ts` (`postsForm`, `postsTableConfig`, `postsModel`)
- `packages/panels/src/index.ts` (`defineResource`, `definePanel`, `Panel`, `Resource` types)

**Stack facts:** `@filamentjs/panels` is built and exports `defineResource`/`definePanel`. better-auth is at `~/lib/auth` (`auth`), with the `user` table in `~/db/schema` (re-exported from auth-schema). Session server-side: `import { getRequest } from '@tanstack/react-start/server'` then `auth.api.getSession({ headers: getRequest().headers })`. Postgres is running.

## Global Constraints

- pnpm v10. No new deps except `better-auth`'s react client is already inside `better-auth` (`better-auth/react`), so no install. If you think you need a new package, STOP and report.
- After adding/moving any route: `pnpm --filter @filamentjs/playground build` (regenerates `routeTree.gen.ts`) THEN `pnpm --filter @filamentjs/playground typecheck`. Fix all type errors before committing.
- Server fns must return serializable shapes (no `unknown` fields; reuse the `Cell`/`FormCell` pattern).
- No `any` in public signatures, no em dashes in comments/commits. Follow the `~/` import alias.
- Commit per task with the exact messages below. Do not push. Postgres container stays running.

---

### Task 1: Panel definition with posts + users resources

**Files:**
- Create `apps/playground/src/filament/resources/users.ts`
- Create `apps/playground/src/filament/panel.ts`

**users.ts:**
```ts
import { buildTable, t } from '@filamentjs/tables';
import { f } from '@filamentjs/forms';
import { user } from '~/db/schema';

export const usersModel = user;

export const usersForm = [
  f.text('name').label('Name').required(),
  f.text('email').label('Email').email().required(),
  f.select('role').label('Role').options({ user: 'User', admin: 'Admin' }).default('user'),
];

export const usersTableConfig = buildTable({
  columns: [
    t.text('name').sortable().searchable(),
    t.text('email').searchable(),
    t.badge('role'),
    t.boolean('banned'),
  ],
  filters: [t.select('role').options({ user: 'User', admin: 'Admin' })],
  actions: [t.editAction()],
});
```

**panel.ts:**
```ts
import { defineResource, definePanel } from '@filamentjs/panels';
import { postsModel, postsForm, postsTableConfig } from './resources/posts';
import { usersModel, usersForm, usersTableConfig } from './resources/users';

export const panel = definePanel({
  basePath: '/admin',
  brand: 'FilamentJS',
  navGroups: ['Content', 'Access'],
  resources: [
    defineResource({
      name: 'Post', slug: 'posts', model: postsModel,
      form: postsForm, table: postsTableConfig, nav: { group: 'Content', sort: 1 },
    }),
    defineResource({
      name: 'User', slug: 'users', model: usersModel,
      form: usersForm, table: usersTableConfig, nav: { group: 'Access', sort: 1 },
      roles: ['admin'],
    }),
  ],
});
```

- [ ] Step 1: Write both files. Step 2: `pnpm --filter @filamentjs/playground typecheck` (clean). Step 3: Commit `feat(playground): define admin panel with posts and users resources`.

---

### Task 2: Generic resource server functions with authz

**Files:** Create `apps/playground/src/server/resource-fns.ts`. Create `apps/playground/src/server/session.ts`.

**session.ts:** a server fn `getSession` returning the better-auth session (or null), plus a helper used inside other server fns:
```ts
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';

export async function currentSession() {
  return auth.api.getSession({ headers: getRequest().headers });
}
```

**resource-fns.ts:** four server fns, each looks up the resource via `panel.getResource(slug)`, and BEFORE doing work calls `currentSession()`; if no session -> throw a redirect-ish error (return `{ ok: false, error: 'unauthorized' }` for mutations, or throw for loaders is fine since the route guard already redirects). Enforce authz: if `resource.roles.length && !resource.roles.includes(session.user.role)` -> unauthorized.

Use `getTableColumns(model as PgTable)` to access the `id` column generically. Reuse `resolveQuery` from `./resolve-query`.

- `listResource(data: { slug: string; params: TableParams })`: returns `{ spec: TableSpec; rows: Record<string, Cell>[]; total: number }` (mirror list-posts.ts).
- `getResourceForm(data: { slug: string; id?: string })`: build `buildSchema(resource.form)`, load record by id if given (`db.select().from(model).where(eq(idCol, id))`), `hydrate`, `resolveSchema`. Return `{ spec: ResolvedNode[]; values: Record<string, FormCell> }`.
- `saveResource(data: { slug: string; id?: string; values: Record<string, FormCell> })`: `compileValidation(schema).safeParse(dehydrate(schema, values))`; on error return `{ ok: false, errors }`; else insert (no id) or update by id; return `{ ok: true, id }`.
- `deleteResource(data: { slug: string; id: string })`: `db.delete(model).where(eq(idCol, id))`; return `{ ok: true }`.

Types `Cell`/`FormCell` as in the existing files. Import `eq`, `getTableColumns` from `drizzle-orm`, `PgTable`/`PgColumn` from `drizzle-orm/pg-core`.

- [ ] Step 1: Write both files. Step 2: typecheck clean. Step 3: Commit `feat(playground): add generic resource server functions with role authz`.

---

### Task 3: Auth client, login page, and the /admin guard + shell layout

**Files:**
- Create `apps/playground/src/lib/auth-client.ts`:
```ts
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
```
- Create `apps/playground/src/routes/login.tsx`: a centered card with email + password inputs and a submit that calls `authClient.signIn.email({ email, password })`; on success `navigate({ to: '/admin/$resource', params: { resource: 'posts' } })`; show an error message on failure.
- Create `apps/playground/src/routes/admin/route.tsx`: a **layout route** (`createFileRoute('/admin')`) with:
  - `beforeLoad`: `const session = await getSession(); if (!session) throw redirect({ to: '/login' })`. Return `{ session }` in context so children/component can read it.
  - `component`: the shell. Left sidebar renders `panel.nav` (groups with `label`, items as `Link to="/admin/$resource" params={{ resource: item.slug }}`). Topbar shows `panel.brand`, the session user email, and a Sign out button calling `authClient.signOut().then(() => navigate({ to: '/login' }))`. `<Outlet />` in the content area. Use the existing shadcn `Button` and Tailwind classes; keep it clean (sidebar `w-60 border-r`, content `flex-1 p-0`).

Make `getSession` a server fn (in `session.ts`, wrap `currentSession` with `createServerFn({ method: 'GET' })`) so `beforeLoad` can call it from the client too.

- [ ] Step 1: Write the three files (+ export `getSession` server fn from session.ts). Step 2: build (regenerate routes) + typecheck clean. Step 3: Commit `feat(playground): add login page and authenticated admin shell`.

---

### Task 4: Generic list/create/edit routes; remove posts-specific routes

**Files:**
- Delete `apps/playground/src/routes/admin/posts.tsx`, `posts_.new.tsx`, `posts_.$id.edit.tsx`.
- Delete now-unused `apps/playground/src/server/list-posts.ts` and `posts-form.ts` IF fully replaced by the generic fns (verify nothing else imports them; if the form-renderer route logic was inline, move it).
- Create `apps/playground/src/routes/admin/$resource.index.tsx` (list), `apps/playground/src/routes/admin/$resource_.new.tsx` (create), `apps/playground/src/routes/admin/$resource_.$id.edit.tsx` (edit).

Mirror the existing posts routes, but read `params.resource` and pass it to the generic server fns. The list page column/spec rendering is identical to the old posts.tsx (it was already driven by the returned `spec`). The list page heading should use the spec-driven resource: fetch it from the loader (add `title` to `listResource`'s return = `resource.pluralName`) or derive from the slug. Prefer returning `title` from `listResource`.

The "New"/"Edit" links become `to="/admin/$resource/new"` / `to="/admin/$resource/$id/edit"` with `params={{ resource, id }}`. The create/edit forms call `saveResource`/`getResourceForm` with the slug. On save error, render the returned field errors via FormRenderer's `errors` prop.

Add a Delete button per row on the list (calls `deleteResource` then `router.invalidate()`), since the config declares a delete action for posts.

- [ ] Step 1: Create the generic routes; delete the posts-specific ones. Step 2: build + typecheck clean. Step 3: Commit `feat(playground): generic resource routes driven by the panel`.

---

### Task 5: Seed an admin + end-to-end verification

- [ ] Step 1: Ensure Postgres up (`cd apps/playground && docker compose up -d`). Ensure there is an admin user: check `docker exec filamentjs-pg psql -U filamentjs -d filamentjs -t -c "select email, role from \"user\""`. If no admin, promote the existing `admin@filamentjs.dev` user: `docker exec filamentjs-pg psql -U filamentjs -d filamentjs -c "update \"user\" set role='admin' where email='admin@filamentjs.dev'"`. (If that user does not exist, create one via `curl -X POST localhost:3000/api/auth/sign-up/email` while the dev server runs, then promote.)
- [ ] Step 2: Start dev server (`nohup pnpm dev > /tmp/pg.log 2>&1 &`), wait for `curl -sf localhost:3000/`.
- [ ] Step 3: Verify guard: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" localhost:3000/admin/posts` should redirect to `/login` (302/307 to /login) when unauthenticated.
- [ ] Step 4: Sign in via API to get a cookie: `curl -s -c /tmp/jar.txt -X POST localhost:3000/api/auth/sign-in/email -H 'Content-Type: application/json' -d '{"email":"admin@filamentjs.dev","password":"password123"}'`. Then `curl -s -b /tmp/jar.txt -L localhost:3000/admin/posts -o /tmp/list.html` and confirm (grep -a) it contains the posts table rows and the sidebar brand "FilamentJS" and both nav items (Posts, Users).
- [ ] Step 5: Confirm the Users resource lists: `curl -s -b /tmp/jar.txt -L localhost:3000/admin/users -o /tmp/users.html`; grep for the admin email and the "Users" heading.
- [ ] Step 6: Stop the dev server (kill pid on 3000). Leave Postgres running.
- [ ] Step 7: Report: build output, typecheck output, the guard redirect result, both grep results, `git log --oneline -8`, and any deviations.

---

## Self-Review

- Resource concept driving routes/nav: Tasks 1, 4. Panel shell + nav: Task 3. Auth guard on /admin: Task 3. Per-resource role authz on server fns (roadmap #4 folded in): Task 2. Second resource (Users): Tasks 1, 4-5. Generic list/create/edit/delete: Tasks 2, 4. All spec panel items covered.
- No placeholders: exact files, exact configs, exact commit messages; tricky bits (auth session access, generic id column, authz check) spelled out; mechanical bits reference exact template files to mirror.
- Type consistency: `panel`/`defineResource`/`definePanel` from `@filamentjs/panels`; `getResourceForm`/`saveResource`/`listResource`/`deleteResource` signatures fixed in Task 2 and consumed in Task 4; `Cell`/`FormCell` reused from existing server files; `getSession` server fn defined in Task 3 and used by the /admin guard.
- Known follow-ups (NOT this plan): the `.live()` reactivity round-trip, and the Codex hardening findings (setPath prototype-pollution guard, dehydrate visibility, required-array validation) live in the roadmap spec.
