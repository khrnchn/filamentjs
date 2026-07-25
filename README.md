# FilamentJS

A lightweight, server-driven admin panel framework for TypeScript, inspired by [Filament](https://filamentphp.com) (PHP/Laravel).

Define your resources, forms, and tables as typed config objects. The server resolves and renders them. No hand-written CRUD pages.

```ts
defineResource({
  name: 'Post',
  slug: 'posts',
  model: posts,                          // your Drizzle table
  form: [
    f.text('title').required().maxLength(255),
    f.select('status').options({ draft: 'Draft', published: 'Published' }),
    f.toggle('published').default(false),
  ],
  table: buildTable({
    columns: [t.text('title').sortable().searchable(), t.badge('status')],
    filters: [t.select('status').options({ draft: 'Draft', published: 'Published' })],
    actions: [t.editAction(), t.deleteAction()],
  }),
})
```

That config generates a list page (sort, search, filter, paginate), create and edit forms with validation, and row actions, all rendered server-side.

## Why

Filament is fantastic but it is PHP/Laravel/Livewire. FilamentJS brings the same config-driven, server-driven model to the TypeScript ecosystem, lightweight and unopinionated about the rest of your app.

| | Filament (PHP) | FilamentJS |
|---|---|---|
| Runtime | Laravel + Livewire | TanStack Start |
| Reactivity | Livewire round-trips | RSC-style loaders + server functions |
| ORM | Eloquent | Drizzle |
| Auth | Laravel | better-auth |
| UI | Blade + Alpine + Tailwind | React + shadcn/ui + Tailwind |

## Stack

TanStack Start (router, server functions, loaders) · TanStack Query / Table / Form · shadcn/ui · Tailwind v4 · Drizzle ORM · Postgres · better-auth (+ admin plugin) · Zod

## How it works

Everything is a **serializable config object** that lives and resolves on the server. The client receives only the data plus a minimal view-spec to paint, and handles cheap local interactivity itself.

```
definePanel({ resources, nav, auth, theme })
  └─ defineResource({ model, form, table })   // static config bound to one Drizzle table
       ├─ form:  Schema  (fields + layout nodes)
       └─ table: Table   (columns, filters, actions)

config (server only) ──► loader / server fn ──► { spec, data } ──► client renders
```

The table data contract is a single server-driven boundary: the client posts `{ sort, search, filters, page, pageSize }`, the server resolves the query via Drizzle and returns `{ rows, total }`.

## Packages

This is a pnpm monorepo.

| Package | Responsibility |
|---|---|
| `@filamentjs/core` | Schema-node tree, `prop \| (ctx) => prop` resolution, flat state store, fluent builder base |
| `@filamentjs/forms` | Field and layout builders, hydrate/dehydrate, Zod validation compiler, serializable form spec |
| `@filamentjs/tables` | Column/filter/action builders, column-state resolution, serializable table spec, `TableParams` contract |
| `@filamentjs/panels` | `defineResource` / `definePanel`, navigation model |
| `apps/playground` | A TanStack Start app that dogfoods everything: Postgres, better-auth, a Posts and a Users resource |

The pure packages have no React, no DB, and no framework code. They are fully unit-tested (78 tests). The Drizzle query resolver is tested against a real Postgres.

## Quickstart

Requirements: Node >= 20, pnpm, Docker.

```bash
make install       # install workspace dependencies
make db-push       # start Postgres (Docker) and push the schema
make dev           # start the playground at http://localhost:3000
```

Create an admin user, sign up then promote to admin:

```bash
# with the dev server running
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@filamentjs.dev","password":"password123","name":"Admin"}'

docker exec filamentjs-pg psql -U filamentjs -d filamentjs \
  -c "update \"user\" set role='admin' where email='admin@filamentjs.dev'"
```

Then open `http://localhost:3000/admin/posts` and sign in.

### Make targets

| Target | Does |
|---|---|
| `make dev` | Start Postgres, then the playground dev server |
| `make build` | Build every package and the app |
| `make test` | Run the full Vitest suite |
| `make typecheck` | Typecheck every workspace package |
| `make db-up` / `db-down` | Start / stop the Postgres container |
| `make db-push` | Push the Drizzle schema to Postgres |
| `make db-reset` | Destroy the volume and re-push a fresh schema |
| `make auth-generate` | Regenerate the better-auth Drizzle schema |

## Defining a panel

```ts
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
      roles: ['admin'],   // role-gated, enforced server-side
    }),
  ],
})
```

One config drives generic `/admin/$resource` routes (list, create, edit), a sidebar shell with grouped nav, a session guard on the whole `/admin` tree, and per-resource role authorization on every data and mutation server function.

## Features

- Server-driven list pages: sort, search, filter, pagination, all in SQL via Drizzle
- Config-driven forms: text, textarea, select, radio, checkbox, toggle, date, plus section/grid layout
- Server-authoritative validation compiled from field rules to Zod
- Conditional fields via `visible(ctx => ...)` / `disabled(ctx => ...)` predicates
- Row, bulk, and header actions
- better-auth sessions with the admin plugin for role-based access
- Dark mode: follows the OS by default, with a topbar toggle that persists

## Status

v1 covers the admin panel shell, forms, and tables. Working and dogfooded end to end.

Roadmap (see `docs/superpowers/specs/`):

1. Type-safe field/model binding, infer column names from the Drizzle table type so a typo is a compile error
2. Relationship fields and joined relation columns
3. Toasts, pending UI, and error boundaries
4. Per-record authorization policies

## Development

```bash
make test          # 78 unit tests + Drizzle resolver tests against real Postgres
make typecheck
make build
```

Design docs and implementation plans live in `docs/superpowers/`.

## License

MIT
