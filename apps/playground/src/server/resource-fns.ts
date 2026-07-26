import { createServerFn } from '@tanstack/react-start';
import { eq, getTableColumns } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { resolveTableSpec, type TableParams, type TableSpec } from '@filamentjs/tables';
import {
  buildSchema,
  hydrate,
  dehydrate,
  resolveSchema,
  compileValidation,
  type ResolvedNode,
} from '@filamentjs/forms';
import { authorizeResource, type PolicyAction } from '@filamentjs/panels';
import { db } from '~/db/client';
import { panel } from '~/filament/panel';
import { currentSession } from './session';
import { resolveQuery } from './resolve-query.js';

type Cell = string | number | boolean | null | Date;
export type FormCell = string | number | boolean | null;

export interface ListResponse {
  title: string;
  rows: Record<string, Cell>[];
  total: number;
  spec: TableSpec;
}

export interface FormResponse {
  spec: ResolvedNode[];
  values: Record<string, FormCell>;
}

export interface SaveResult {
  ok: boolean;
  id?: string;
  errors?: Record<string, string>;
  error?: string;
}

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

// Record-level policies need the row before the operation runs, so the gate loads it
// when an id is given and hands it back for the handler to reuse.
//
// Loaders throw on auth failure (the /admin route guard already redirects
// unauthenticated users; a role mismatch is a hard error). Mutations return an
// { ok: false, error } shape so the client can surface it without a crash.
async function gateResource(slug: string, action: PolicyAction, id?: string) {
  const resource = panel.getResource(slug);
  if (!resource) return { error: `Unknown resource: ${slug}` };
  const session = await currentSession();
  if (!session) return { error: 'unauthorized' };

  const model = resource.model as PgTable;
  let record: Record<string, unknown> | undefined;
  if (id) {
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    const rows = await db.select().from(model).where(eq(idCol, id)).limit(1);
    record = rows[0];
    if (!record) return { error: `No ${resource.name} with id ${id}` };
  }

  const allowed = authorizeResource(resource, action, {
    user: { id: session.user.id, role: session.user.role },
    record,
  });
  if (!allowed) return { error: 'unauthorized' };
  return { resource, record };
}

async function authorize(slug: string, action: PolicyAction, id?: string) {
  const gate = await gateResource(slug, action, id);
  if ('error' in gate) throw new Error(gate.error);
  return gate;
}

export const listResource = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; params: TableParams }) => input)
  .handler(async ({ data }): Promise<ListResponse> => {
    const { resource } = await authorize(data.slug, 'view');
    const model = resource.model as PgTable;
    const result = await resolveQuery(model, resource.table, data.params);
    return {
      title: resource.pluralName,
      rows: result.rows as Record<string, Cell>[],
      total: result.total,
      spec: resolveTableSpec(resource.table),
    };
  });

export const getResourceForm = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id?: string }) => input)
  .handler(async ({ data }): Promise<FormResponse> => {
    const { resource, record } = await authorize(data.slug, data.id ? 'update' : 'create', data.id);
    const schema = buildSchema(resource.form);
    const values = hydrate(schema, record) as Record<string, FormCell>;
    const spec = resolveSchema(schema, values);
    return { spec, values };
  });

export const saveResource = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id?: string; values: Record<string, FormCell> }) => input)
  .handler(async ({ data }): Promise<SaveResult> => {
    const gate = await gateResource(data.slug, data.id ? 'update' : 'create', data.id);
    if ('error' in gate) return { ok: false, error: gate.error };
    const resource = gate.resource;
    const model = resource.model as PgTable;
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    const schema = buildSchema(resource.form);
    const result = compileValidation(schema).safeParse(dehydrate(schema, data.values));

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errors[String(i.path[0])] = i.message;
      });
      return { ok: false, errors };
    }

    const record = result.data as Record<string, unknown>;

    if (data.id) {
      await db.update(model).set(record).where(eq(idCol, data.id));
      return { ok: true, id: data.id };
    }

    const inserted = await db.insert(model).values(record).returning({ id: idCol });
    return { ok: true, id: String((inserted[0] as { id: unknown }).id) };
  });

export const deleteResource = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id: string }) => input)
  .handler(async ({ data }): Promise<DeleteResult> => {
    const gate = await gateResource(data.slug, 'delete', data.id);
    if ('error' in gate) return { ok: false, error: gate.error };
    const model = gate.resource.model as PgTable;
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    await db.delete(model).where(eq(idCol, data.id));
    return { ok: true };
  });
