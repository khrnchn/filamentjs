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
