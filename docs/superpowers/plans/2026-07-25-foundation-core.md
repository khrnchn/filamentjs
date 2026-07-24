# FilamentJS Foundation + Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the pnpm monorepo and the `@filamentjs/core` package: the shared schema-node tree, the `prop | (ctx) => prop` resolution engine, a flat state store with dot-path access, and the fluent builder base.

**Architecture:** `core` is the engine every other package builds on (Filament's `schemas` equivalent). It defines a recursive `SchemaNode` union, a `Ctx` object exposing `get`/`set` over a flat `statePath -> value` store, and `resolveProp` which turns any `Prop<T>` (literal or function) into a concrete value. Builders are thin fluent wrappers that accumulate a plain config object. No React, no DB, no framework code here: pure TypeScript, fully unit-testable.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vitest, tsup for builds.

## Global Constraints

- Package manager: **pnpm** with workspaces. Node >= 20.
- TypeScript **strict** mode on. No `any` in public signatures; use `unknown` at boundaries.
- No em dashes in any code comments, docs, or commit messages. Use commas or short sentences.
- Comments explain gotchas/constraints only. No verbose docstrings.
- Every package builds with **tsup** to ESM, and exports types.
- Tests colocated under each package's `src` as `*.test.ts`, run by Vitest.
- Package names are scoped `@filamentjs/<name>`.

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.npmrc`

**Interfaces:**
- Consumes: nothing.
- Produces: a working pnpm workspace where `pnpm -r test` runs Vitest, and packages resolve via `@filamentjs/*`. Shared `tsconfig.base.json` with strict settings for packages to extend.

- [ ] **Step 1: Write root `package.json`**

```json
{
  "name": "filamentjs",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsup": "^8.3.0"
  },
  "packageManager": "pnpm@9.12.0"
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Write `.npmrc`**

```
auto-install-peers=true
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 5: Write root `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Install and verify workspace resolves**

Run: `pnpm install`
Expected: completes without error, creates `node_modules` and `pnpm-lock.yaml`.

Run: `pnpm test`
Expected: Vitest runs and reports "No test files found" (no tests yet). Exit code 0 or the "no tests" notice; not a config error.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts .npmrc pnpm-lock.yaml
git commit -m "chore: scaffold pnpm monorepo with vitest and tsup"
```

---

### Task 2: Core package skeleton + shared types

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/types.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` from Task 1.
- Produces:
  - `type Prop<T> = T | ((ctx: Ctx) => T)`
  - `interface Ctx { get(path: string): unknown; set(path: string, value: unknown): void; record?: Record<string, unknown>; values: Record<string, unknown>; }`
  - `interface SchemaNode { type: string; key?: string; children?: SchemaNode[]; visible?: Prop<boolean>; disabled?: Prop<boolean>; columnSpan?: Prop<number>; }`
  - `interface FieldNode extends SchemaNode { name: string; label?: Prop<string>; }`

- [ ] **Step 1: Write `packages/core/package.json`**

```json
{
  "name": "@filamentjs/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

- [ ] **Step 4: Write `packages/core/src/types.ts`**

```ts
export interface Ctx {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  record?: Record<string, unknown>;
  values: Record<string, unknown>;
}

export type Prop<T> = T | ((ctx: Ctx) => T);

export interface SchemaNode {
  type: string;
  key?: string;
  children?: SchemaNode[];
  visible?: Prop<boolean>;
  disabled?: Prop<boolean>;
  columnSpan?: Prop<number>;
}

export interface FieldNode extends SchemaNode {
  name: string;
  label?: Prop<string>;
}
```

- [ ] **Step 5: Write `packages/core/src/index.ts`**

```ts
export * from './types.js';
```

- [ ] **Step 6: Install workspace dep and typecheck**

Run: `pnpm install`
Expected: `@filamentjs/core` linked into workspace.

Run: `pnpm --filter @filamentjs/core typecheck`
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core pnpm-lock.yaml
git commit -m "feat(core): add package skeleton and shared schema types"
```

---

### Task 3: Dot-path get/set utilities

**Files:**
- Create: `packages/core/src/path.ts`
- Create: `packages/core/src/path.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getPath(obj: Record<string, unknown>, path: string): unknown` — reads a dot path, returns `undefined` if any segment is missing.
  - `setPath(obj: Record<string, unknown>, path: string, value: unknown): void` — writes a dot path, creating intermediate objects as needed. Mutates `obj` in place.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/path.test.ts
import { describe, it, expect } from 'vitest';
import { getPath, setPath } from './path.js';

describe('getPath', () => {
  it('reads a top-level key', () => {
    expect(getPath({ name: 'Ada' }, 'name')).toBe('Ada');
  });
  it('reads a nested key', () => {
    expect(getPath({ author: { name: 'Ada' } }, 'author.name')).toBe('Ada');
  });
  it('returns undefined for a missing segment', () => {
    expect(getPath({ author: {} }, 'author.name')).toBeUndefined();
    expect(getPath({}, 'a.b.c')).toBeUndefined();
  });
});

describe('setPath', () => {
  it('sets a top-level key', () => {
    const o: Record<string, unknown> = {};
    setPath(o, 'name', 'Ada');
    expect(o).toEqual({ name: 'Ada' });
  });
  it('creates intermediate objects', () => {
    const o: Record<string, unknown> = {};
    setPath(o, 'author.name', 'Ada');
    expect(o).toEqual({ author: { name: 'Ada' } });
  });
  it('overwrites an existing value', () => {
    const o: Record<string, unknown> = { author: { name: 'Ada' } };
    setPath(o, 'author.name', 'Grace');
    expect(o).toEqual({ author: { name: 'Grace' } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/core/src/path.test.ts`
Expected: FAIL, cannot resolve `./path.js` (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/path.ts
export function getPath(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!;
    const next = cur[seg];
    if (next == null || typeof next !== 'object') {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]!] = value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/core/src/path.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Export from index**

```ts
// packages/core/src/index.ts
export * from './types.js';
export * from './path.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/path.ts packages/core/src/path.test.ts packages/core/src/index.ts
git commit -m "feat(core): add dot-path get/set utilities"
```

---

### Task 4: State store + Ctx factory

**Files:**
- Create: `packages/core/src/state.ts`
- Create: `packages/core/src/state.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `getPath`, `setPath` (Task 3); `Ctx` (Task 2).
- Produces:
  - `createStore(initial?: Record<string, unknown>): Store` where `interface Store { values: Record<string, unknown>; get(path: string): unknown; set(path: string, value: unknown): void; }`
  - `createCtx(store: Store, record?: Record<string, unknown>): Ctx` — builds a `Ctx` whose `get`/`set` delegate to the store and whose `values` points at the store's live object.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/state.test.ts
import { describe, it, expect } from 'vitest';
import { createStore, createCtx } from './state.js';

describe('createStore', () => {
  it('seeds from initial values', () => {
    const s = createStore({ name: 'Ada' });
    expect(s.get('name')).toBe('Ada');
  });
  it('sets and reads nested paths', () => {
    const s = createStore();
    s.set('author.name', 'Ada');
    expect(s.get('author.name')).toBe('Ada');
    expect(s.values).toEqual({ author: { name: 'Ada' } });
  });
});

describe('createCtx', () => {
  it('delegates get/set to the store', () => {
    const s = createStore({ active: true });
    const ctx = createCtx(s);
    expect(ctx.get('active')).toBe(true);
    ctx.set('active', false);
    expect(s.get('active')).toBe(false);
  });
  it('exposes record and live values', () => {
    const s = createStore({ a: 1 });
    const ctx = createCtx(s, { id: 5 });
    expect(ctx.record).toEqual({ id: 5 });
    expect(ctx.values).toBe(s.values);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/core/src/state.test.ts`
Expected: FAIL, cannot resolve `./state.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/state.ts
import type { Ctx } from './types.js';
import { getPath, setPath } from './path.js';

export interface Store {
  values: Record<string, unknown>;
  get(path: string): unknown;
  set(path: string, value: unknown): void;
}

export function createStore(initial: Record<string, unknown> = {}): Store {
  const values = structuredClone(initial);
  return {
    values,
    get: (path) => getPath(values, path),
    set: (path, value) => setPath(values, path, value),
  };
}

export function createCtx(store: Store, record?: Record<string, unknown>): Ctx {
  return {
    get: (path) => store.get(path),
    set: (path, value) => store.set(path, value),
    record,
    values: store.values,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/core/src/state.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Export from index**

```ts
// packages/core/src/index.ts
export * from './types.js';
export * from './path.js';
export * from './state.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/state.ts packages/core/src/state.test.ts packages/core/src/index.ts
git commit -m "feat(core): add state store and ctx factory"
```

---

### Task 5: Prop resolution

**Files:**
- Create: `packages/core/src/resolve.ts`
- Create: `packages/core/src/resolve.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Prop`, `Ctx` (Task 2).
- Produces:
  - `resolveProp<T>(prop: Prop<T> | undefined, ctx: Ctx, fallback: T): T` — if `prop` is a function, call it with `ctx`; if it is a literal, return it; if `undefined`, return `fallback`.
  - `isNodeVisible(node: SchemaNode, ctx: Ctx): boolean` — resolves `node.visible` with fallback `true`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveProp, isNodeVisible } from './resolve.js';
import { createStore, createCtx } from './state.js';

const ctxWith = (v: Record<string, unknown>) => createCtx(createStore(v));

describe('resolveProp', () => {
  it('returns a literal unchanged', () => {
    expect(resolveProp('hello', ctxWith({}), 'fb')).toBe('hello');
  });
  it('calls a function prop with ctx', () => {
    const ctx = ctxWith({ active: true });
    expect(resolveProp((c) => c.get('active'), ctx, false)).toBe(true);
  });
  it('returns fallback when undefined', () => {
    expect(resolveProp<number>(undefined, ctxWith({}), 42)).toBe(42);
  });
});

describe('isNodeVisible', () => {
  it('defaults to visible', () => {
    expect(isNodeVisible({ type: 'text' }, ctxWith({}))).toBe(true);
  });
  it('resolves a visibility predicate', () => {
    const ctx = ctxWith({ active: false });
    const node = { type: 'text', visible: (c: { get(p: string): unknown }) => c.get('active') === true };
    expect(isNodeVisible(node, ctx)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/core/src/resolve.test.ts`
Expected: FAIL, cannot resolve `./resolve.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/resolve.ts
import type { Ctx, Prop, SchemaNode } from './types.js';

export function resolveProp<T>(prop: Prop<T> | undefined, ctx: Ctx, fallback: T): T {
  if (prop === undefined) return fallback;
  if (typeof prop === 'function') return (prop as (ctx: Ctx) => T)(ctx);
  return prop;
}

export function isNodeVisible(node: SchemaNode, ctx: Ctx): boolean {
  return resolveProp(node.visible, ctx, true);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/core/src/resolve.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Export from index**

```ts
// packages/core/src/index.ts
export * from './types.js';
export * from './path.js';
export * from './state.js';
export * from './resolve.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/resolve.ts packages/core/src/resolve.test.ts packages/core/src/index.ts
git commit -m "feat(core): add prop resolution and node visibility"
```

---

### Task 6: Fluent builder base

**Files:**
- Create: `packages/core/src/builder.ts`
- Create: `packages/core/src/builder.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `SchemaNode`, `FieldNode`, `Prop` (Task 2).
- Produces:
  - `class NodeBuilder<N extends SchemaNode>` with `visible(p: Prop<boolean>)`, `disabled(p: Prop<boolean>)`, `columnSpan(p: Prop<number>)`, each returning `this`, and `build(): N` returning the accumulated node.
  - Rationale for keeping this factored: it is shared, non-trivial fluent state reused by every field and layout builder in `forms` and `tables`. This is a genuine deep module, not a pass-through.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/builder.test.ts
import { describe, it, expect } from 'vitest';
import { NodeBuilder } from './builder.js';
import type { SchemaNode } from './types.js';

describe('NodeBuilder', () => {
  it('builds a node with the given type', () => {
    const node = new NodeBuilder<SchemaNode>('text').build();
    expect(node).toEqual({ type: 'text' });
  });
  it('accumulates chained props', () => {
    const pred = () => true;
    const node = new NodeBuilder<SchemaNode>('text').visible(pred).columnSpan(2).build();
    expect(node.visible).toBe(pred);
    expect(node.columnSpan).toBe(2);
  });
  it('returns this for chaining', () => {
    const b = new NodeBuilder<SchemaNode>('text');
    expect(b.disabled(true)).toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/core/src/builder.test.ts`
Expected: FAIL, cannot resolve `./builder.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/builder.ts
import type { Prop, SchemaNode } from './types.js';

export class NodeBuilder<N extends SchemaNode> {
  protected node: SchemaNode;

  constructor(type: string) {
    this.node = { type };
  }

  visible(p: Prop<boolean>): this {
    this.node.visible = p;
    return this;
  }

  disabled(p: Prop<boolean>): this {
    this.node.disabled = p;
    return this;
  }

  columnSpan(p: Prop<number>): this {
    this.node.columnSpan = p;
    return this;
  }

  build(): N {
    return this.node as N;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/core/src/builder.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Export from index**

```ts
// packages/core/src/index.ts
export * from './types.js';
export * from './path.js';
export * from './state.js';
export * from './resolve.js';
export * from './builder.js';
```

- [ ] **Step 6: Full package check + commit**

Run: `pnpm --filter @filamentjs/core typecheck && pnpm vitest run packages/core`
Expected: no type errors, all tests pass.

Run: `pnpm --filter @filamentjs/core build`
Expected: `dist/index.js` and `dist/index.d.ts` produced.

```bash
git add packages/core/src/builder.ts packages/core/src/builder.test.ts packages/core/src/index.ts
git commit -m "feat(core): add fluent NodeBuilder base"
```

---

## Self-Review

**Spec coverage (core-relevant sections):**
- `Prop<T> = T | (ctx) => prop` resolution model → Tasks 2, 5. Covered.
- Flat `statePath -> value` store + dot-path access → Tasks 3, 4. Covered.
- Recursive `SchemaNode` tree, fields vs layout distinction (`FieldNode` adds `name`) → Task 2. Covered.
- Fluent builder base reused by forms/tables → Task 6. Covered.
- pnpm monorepo, Vitest, tsup, strict TS → Task 1. Covered.
- Node visibility resolution (used by conditional fields) → Task 5. Covered.

Deferred to later plans (correctly out of scope for foundation): React renderers, Zod validation compile (forms plan), query resolver (tables plan), routing/shell (panels plan), DB/auth (playground plan).

**Placeholder scan:** No TBD/TODO/"handle edge cases" placeholders. Every code step contains complete code.

**Type consistency:** `Ctx`, `Prop<T>`, `SchemaNode`, `FieldNode` defined in Task 2 and used consistently in Tasks 4, 5, 6. `Store` defined in Task 4 and consumed by `createCtx` in the same task. `getPath`/`setPath` names consistent across Tasks 3 and 4. `resolveProp` signature consistent across Tasks 5 and future use.
