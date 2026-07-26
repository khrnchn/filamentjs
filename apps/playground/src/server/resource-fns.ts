import { createServerFn } from '@tanstack/react-start';
import { asc, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { resolveTableSpec, type TableParams, type TableSpec } from '@filamentjs/tables';
import {
  buildSchema,
  hydrate,
  dehydrate,
  resolveSchema,
  compileValidation,
  type FormFieldNode,
  type ResolvedNode,
} from '@filamentjs/forms';
import { authorizeResource, type PolicyAction, type Resource } from '@filamentjs/panels';
import { resolveInfolist, type InfolistEntryNode, type ResolvedEntry } from '@filamentjs/infolists';
import type { SchemaNode } from '@filamentjs/core';
import { db } from '~/db/client';
import * as dbSchema from '~/db/schema';
import { panel } from '~/filament/panel';
import { currentSession } from './session';
import { resolveQuery } from './resolve-query.js';

type Cell = string | number | boolean | null | Date;
export type FormCell = string | number | boolean | null;

export interface ListResponse {
  title: string;
  rows: Record<string, Cell>[];
  permissions: Array<{ update: boolean; delete: boolean }>;
  total: number;
  summaries?: Record<string, number>;
  spec: TableSpec;
}

export interface FormResponse {
  title: string;
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
  const user = { id: session.user.id, role: session.user.role };

  const model = resource.model as PgTable;
  let record: Record<string, unknown> | undefined;
  if (id) {
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    const rows = await db.select().from(model).where(eq(idCol, id)).limit(1);
    record = rows[0];
    if (!record) return { error: `No ${resource.name} with id ${id}` };
  }

  const allowed = authorizeResource(resource, action, {
    user,
    record,
  });
  if (!allowed) return { error: 'unauthorized' };
  return { resource, record, user };
}

// Drizzle wraps driver errors, so the Postgres SQLSTATE lives on the cause. Anything
// unrecognised stays generic: the raw message carries the whole failing query.
function databaseMessage(e: unknown): string {
  console.error('Mutation failed', e);
  const code =
    (e as { code?: string }).code ?? ((e as { cause?: { code?: string } }).cause?.code ?? '');
  if (code === '23505') return 'That value is already taken.';
  if (code === '23503') return 'Another record still references this one.';
  if (code === '23502') return 'A required value is missing.';
  return 'Could not save. Please try again.';
}

async function authorize(slug: string, action: PolicyAction, id?: string) {
  const gate = await gateResource(slug, action, id);
  if ('error' in gate) throw new Error(gate.error);
  return gate;
}

async function buildFormResponse(
  resource: Resource,
  record: Record<string, unknown> | undefined,
  values: Record<string, FormCell>,
): Promise<FormResponse> {
  const schema = buildSchema(resource.form);
  const spec = resolveSchema(schema, values, record);
  const pending = schema.map((node, index) => ({
    node: node as FormFieldNode,
    resolved: spec[index]!,
  }));

  while (pending.length > 0) {
    const { node, resolved } = pending.shift()!;
    if (node.relation) {
      const relatedModel = node.relation.model as PgTable;
      const columns = getTableColumns(relatedModel) as Record<string, PgColumn>;
      const valueColumn = columns[node.relation.valueColumn]!;
      const labelColumn = columns[node.relation.labelColumn]!;
      const rows = await db
        .select({ value: valueColumn, label: labelColumn })
        .from(relatedModel)
        .orderBy(asc(labelColumn))
        .limit(100);
      resolved.options = Object.fromEntries(
        rows.map((row) => [String(row.value), String(row.label)]),
      );
    }

    node.children?.forEach((child, index) => {
      pending.push({
        node: child as FormFieldNode,
        resolved: resolved.children![index]!,
      });
    });
  }

  return { title: resource.name, spec, values };
}

export const listResource = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; params: TableParams }) => input)
  .handler(async ({ data }): Promise<ListResponse> => {
    const { resource, user } = await authorize(data.slug, 'view');
    const model = resource.model as PgTable;
    const result = await resolveQuery(model, resource.table, data.params);
    const spec = resolveTableSpec(resource.table);
    return {
      title: resource.pluralName,
      rows: result.rows as Record<string, Cell>[],
      permissions: result.rows.map((record) => ({
        update: authorizeResource(resource, 'update', { user, record }),
        delete: authorizeResource(resource, 'delete', { user, record }),
      })),
      total: result.total,
      summaries: result.summaries,
      spec: {
        ...spec,
        headerActions: authorizeResource(resource, 'create', { user })
          ? spec.headerActions
          : spec.headerActions.filter((action) => action.type !== 'create'),
      },
    };
  });

export const getResourceForm = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id?: string }) => input)
  .handler(async ({ data }): Promise<FormResponse> => {
    const { resource, record } = await authorize(data.slug, data.id ? 'update' : 'create', data.id);
    const schema = buildSchema(resource.form);
    const values = hydrate(schema, record) as Record<string, FormCell>;
    return buildFormResponse(resource, record, values);
  });

export const resolveForm = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id?: string; values: Record<string, FormCell> }) => input)
  .handler(async ({ data }): Promise<FormResponse> => {
    const { resource, record } = await authorize(data.slug, data.id ? 'update' : 'create', data.id);
    return buildFormResponse(resource, record, data.values);
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

    // Constraint violations and other driver errors are not field errors, so they
    // come back as { ok: false, error } for the client to surface as a toast.
    try {
      if (data.id) {
        await db.update(model).set(record).where(eq(idCol, data.id));
        return { ok: true, id: data.id };
      }
      const inserted = await db.insert(model).values(record).returning({ id: idCol });
      return { ok: true, id: String((inserted[0] as { id: unknown }).id) };
    } catch (e) {
      return { ok: false, error: databaseMessage(e) };
    }
  });

export const deleteResource = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id: string }) => input)
  .handler(async ({ data }): Promise<DeleteResult> => {
    const gate = await gateResource(data.slug, 'delete', data.id);
    if ('error' in gate) return { ok: false, error: gate.error };
    const model = gate.resource.model as PgTable;
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    try {
      await db.delete(model).where(eq(idCol, data.id));
    } catch (e) {
      return { ok: false, error: databaseMessage(e) };
    }
    return { ok: true };
  });

export const deleteResources = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; ids: string[] }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; deleted: number; error?: string }> => {
    const gate = await gateResource(data.slug, 'view');
    if ('error' in gate) return { ok: false, deleted: 0, error: gate.error };
    if (data.ids.length === 0) return { ok: true, deleted: 0 };

    const model = gate.resource.model as PgTable;
    const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
    const records = await db.select().from(model).where(inArray(idCol, data.ids));
    const permittedIds = records
      .filter((record) =>
        authorizeResource(gate.resource, 'delete', { user: gate.user, record }),
      )
      .map((record) => String((record as Record<string, unknown>).id));

    if (permittedIds.length === 0) return { ok: true, deleted: 0 };

    try {
      const deleted = await db
        .delete(model)
        .where(inArray(idCol, permittedIds))
        .returning({ id: idCol });
      return { ok: true, deleted: deleted.length };
    } catch (e) {
      return { ok: false, deleted: 0, error: databaseMessage(e) };
    }
  });

export interface ViewResponse {
  title: string;
  spec: ResolvedEntry[];
}

// A resource without a declared infolist still gets a view page: its form fields become
// read-only entries, keeping labels, layout and visibility closures.
const entryTypeForField: Record<string, string> = {
  toggle: 'boolean',
  checkbox: 'boolean',
  datePicker: 'date',
  dateTimePicker: 'dateTime',
};

function fieldAsEntry(node: SchemaNode): InfolistEntryNode {
  const field = node as InfolistEntryNode;
  const entry: InfolistEntryNode = {
    ...field,
    type:
      node.type === 'section' || node.type === 'grid'
        ? node.type
        : (entryTypeForField[node.type] ?? 'text'),
  };
  if (node.children) entry.children = node.children.map(fieldAsEntry);
  return entry;
}

export const getResourceView = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id: string }) => input)
  .handler(async ({ data }): Promise<ViewResponse> => {
    const { resource, record } = await authorize(data.slug, 'view', data.id);
    const nodes = resource.infolist.length
      ? resource.infolist.map((builder) => builder.build() as InfolistEntryNode)
      : buildSchema(resource.form).map(fieldAsEntry);

    // The gate loads a flat select, so a dot-path entry ("author.name") needs the
    // relation fetched alongside it. One level deep, same rule as the table resolver.
    const withClause: Record<string, { columns: Record<string, true> }> = {};
    const pending = [...nodes];
    while (pending.length > 0) {
      const node = pending.shift()!;
      if (node.children) pending.push(...(node.children as InfolistEntryNode[]));
      const [relation, field] = (node.name ?? '').split('.');
      if (!relation || !field) continue;
      (withClause[relation] ??= { columns: {} }).columns[field] = true;
    }

    let row = record ?? {};
    if (Object.keys(withClause).length) {
      const model = resource.model as PgTable;
      const schemaKey = Object.keys(dbSchema).find(
        (key) => (dbSchema as Record<string, unknown>)[key] === model,
      );
      if (!schemaKey) throw new Error('Table is not exported from db/schema, cannot load relations');
      const idCol = (getTableColumns(model) as Record<string, PgColumn>).id!;
      const relationalQuery = (
        db.query as unknown as Record<
          string,
          { findFirst: (config: unknown) => Promise<Record<string, unknown> | undefined> }
        >
      )[schemaKey]!;
      row = (await relationalQuery.findFirst({ with: withClause, where: eq(idCol, data.id) })) ?? row;
    }

    return { title: resource.name, spec: resolveInfolist(nodes, row) };
  });
