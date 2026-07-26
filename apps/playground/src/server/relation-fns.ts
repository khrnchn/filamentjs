import { createServerFn } from '@tanstack/react-start';
import { and, eq, getTableColumns } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { resolveTableSpec, type TableConfig, type TableParams } from '@filamentjs/tables';
import {
  buildSchema,
  compileValidation,
  dehydrate,
  hydrate,
  resolveSchema,
  type ResolvedNode,
} from '@filamentjs/forms';
import { authorizeResource, type PolicyUser, type Resource } from '@filamentjs/panels';
import { db } from '~/db/client';
import { panel } from '~/filament/panel';
import { currentSession } from './session';
import { resolveQuery } from './resolve-query.js';
import type { DeleteResult, FormCell, ListResponse, SaveResult } from './resource-fns.js';

export interface RelationListResponse extends ListResponse {
  form: ResolvedNode[];
  values: Record<string, FormCell>;
}

type ParentGate =
  | { error: string }
  | {
      resource: Resource;
      record: Record<string, unknown>;
      user: PolicyUser;
    };

async function gateParent(slug: string, id: string): Promise<ParentGate> {
  const resource = panel.getResource(slug);
  if (!resource) return { error: `Unknown resource: ${slug}` };
  const session = await currentSession();
  if (!session) return { error: 'unauthorized' };
  const user = { id: session.user.id, role: session.user.role };

  const parentTable = resource.model as PgTable;
  const parentId = (getTableColumns(parentTable) as Record<string, PgColumn>).id!;
  const rows = await db.select().from(parentTable).where(eq(parentId, id)).limit(1);
  const record = rows[0];
  if (!record) return { error: `No ${resource.name} with id ${id}` };
  if (!authorizeResource(resource, 'update', { user, record })) return { error: 'unauthorized' };

  return { resource, record, user };
}

async function gateRelation(slug: string, id: string, relationSlug: string) {
  const gate = await gateParent(slug, id);
  if ('error' in gate) return gate;
  const relation = gate.resource.relationManagers.find(
    (candidate) => candidate.slug === relationSlug,
  );
  if (!relation) return { error: `Unknown relation: ${relationSlug}` };
  return { ...gate, relation };
}

async function authorizeRelation(slug: string, id: string, relationSlug: string) {
  const gate = await gateRelation(slug, id, relationSlug);
  if ('error' in gate) throw new Error(gate.error);
  return gate;
}

function databaseMessage(e: unknown): string {
  console.error('Mutation failed', e);
  const code =
    (e as { code?: string }).code ?? ((e as { cause?: { code?: string } }).cause?.code ?? '');
  if (code === '23505') return 'That value is already taken.';
  if (code === '23503') return 'Another record still references this one.';
  if (code === '23502') return 'A required value is missing.';
  return 'Could not save. Please try again.';
}

export const listRelationManagers = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id: string }) => input)
  .handler(async ({ data }): Promise<Array<{ slug: string; title: string }>> => {
    const gate = await gateParent(data.slug, data.id);
    if ('error' in gate) throw new Error(gate.error);
    return gate.resource.relationManagers.map(({ slug, title }) => ({ slug, title }));
  });

export const listRelated = createServerFn({ method: 'GET' })
  .validator(
    (input: { slug: string; id: string; relation: string; params: TableParams }) => input,
  )
  .handler(async ({ data }): Promise<RelationListResponse> => {
    const { relation } = await authorizeRelation(data.slug, data.id, data.relation);
    const childTable = relation.model as PgTable;
    const childColumns = getTableColumns(childTable) as Record<string, PgColumn>;
    if (!childColumns[relation.foreignKey]) {
      throw new Error(`Unknown foreign key: ${relation.foreignKey}`);
    }
    if (typeof relation.table === 'function') {
      throw new Error(`Relation table was not normalized: ${relation.slug}`);
    }
    if (typeof relation.form === 'function') {
      throw new Error(`Relation form was not normalized: ${relation.slug}`);
    }

    const scopedTable: TableConfig = {
      ...relation.table,
      filters: [
        ...relation.table.filters,
        { type: 'select', name: relation.foreignKey },
      ],
    };
    const result = await resolveQuery(childTable, scopedTable, {
      ...data.params,
      filters: {
        ...data.params.filters,
        [relation.foreignKey]: data.id,
      },
    });
    const schema = buildSchema(relation.form ?? []);
    const values = hydrate(schema) as Record<string, FormCell>;

    return {
      title: relation.title,
      rows: result.rows as ListResponse['rows'],
      permissions: result.rows.map(() => ({ update: true, delete: true })),
      total: result.total,
      summaries: result.summaries,
      spec: resolveTableSpec(relation.table),
      form: resolveSchema(schema, values),
      values,
    };
  });

export const saveRelated = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      slug: string;
      id: string;
      relation: string;
      childId?: string;
      values: Record<string, FormCell>;
    }) => input,
  )
  .handler(async ({ data }): Promise<SaveResult> => {
    const gate = await gateRelation(data.slug, data.id, data.relation);
    if ('error' in gate) return { ok: false, error: gate.error };
    const { relation } = gate;
    const childTable = relation.model as PgTable;
    const columns = getTableColumns(childTable) as Record<string, PgColumn>;
    const idColumn = columns.id!;
    const foreignKeyColumn = columns[relation.foreignKey];
    if (!foreignKeyColumn) return { ok: false, error: `Unknown foreign key: ${relation.foreignKey}` };
    if (typeof relation.form === 'function') {
      return { ok: false, error: `Relation form was not normalized: ${relation.slug}` };
    }

    const schema = buildSchema(relation.form ?? []);
    const parsed = compileValidation(schema).safeParse(dehydrate(schema, data.values));
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      return { ok: false, errors };
    }
    const record = parsed.data as Record<string, unknown>;

    try {
      if (data.childId) {
        const updated = await db
          .update(childTable)
          .set(record)
          .where(and(eq(idColumn, data.childId), eq(foreignKeyColumn, data.id)))
          .returning({ id: idColumn });
        if (updated.length === 0) return { ok: false, error: 'Related record not found' };
        return { ok: true, id: data.childId };
      }

      const inserted = await db
        .insert(childTable)
        .values({ ...record, [relation.foreignKey]: data.id })
        .returning({ id: idColumn });
      return { ok: true, id: String((inserted[0] as { id: unknown }).id) };
    } catch (e) {
      return { ok: false, error: databaseMessage(e) };
    }
  });

export const deleteRelated = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; id: string; relation: string; childId: string }) => input,
  )
  .handler(async ({ data }): Promise<DeleteResult> => {
    const gate = await gateRelation(data.slug, data.id, data.relation);
    if ('error' in gate) return { ok: false, error: gate.error };
    const childTable = gate.relation.model as PgTable;
    const columns = getTableColumns(childTable) as Record<string, PgColumn>;
    const idColumn = columns.id!;
    const foreignKeyColumn = columns[gate.relation.foreignKey];
    if (!foreignKeyColumn) {
      return { ok: false, error: `Unknown foreign key: ${gate.relation.foreignKey}` };
    }

    try {
      const deleted = await db
        .delete(childTable)
        .where(and(eq(idColumn, data.childId), eq(foreignKeyColumn, data.id)))
        .returning({ id: idColumn });
      if (deleted.length === 0) return { ok: false, error: 'Related record not found' };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: databaseMessage(e) };
    }
  });
