import {
  and,
  or,
  asc,
  desc,
  avg,
  count,
  max,
  min,
  sum,
  ilike,
  eq,
  inArray,
  isNull,
  getTableColumns,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { Row, TableConfig, TableParams, TableResult } from '@filamentjs/tables';
import { db } from '../db/client.js';
import * as schema from '../db/schema.js';

// Turns the serializable TableParams into a real Postgres query via Drizzle.
// This is the server side of the server-driven table contract. Dot-path
// relation columns are not searched/sorted here yet (top-level columns only).
export async function resolveQuery(
  table: PgTable,
  config: TableConfig,
  params: TableParams,
): Promise<TableResult> {
  const columns = getTableColumns(table) as Record<string, PgColumn>;
  const conditions: SQL[] = [];

  if (params.search) {
    const term = `%${params.search}%`;
    const searchConds = config.columns
      .filter((c) => c.searchable && columns[c.name])
      .map((c) => ilike(columns[c.name]!, term));
    if (searchConds.length) conditions.push(or(...searchConds)!);
  }

  // Per-column searches AND together, and with the global search. Only columns that
  // exist on this table and opted into searching qualify, which also skips dot paths.
  for (const [name, term] of Object.entries(params.columnSearches ?? {})) {
    if (!term) continue;
    const column = config.columns.find((c) => c.name === name);
    if (!column?.searchable || !columns[name]) continue;
    conditions.push(ilike(columns[name]!, `%${term}%`));
  }

  for (const filter of config.filters) {
    const value = params.filters?.[filter.name];
    if (value === undefined || value === null || value === '') continue;
    const col = columns[filter.name];
    if (!col) continue;
    if (filter.type === 'select') {
      if (filter.multiple && Array.isArray(value)) conditions.push(inArray(col, value));
      else conditions.push(eq(col, value));
    } else if (filter.type === 'ternary') {
      if (value === 'true') conditions.push(eq(col, true));
      else if (value === 'false') conditions.push(eq(col, false));
      else if (value === 'blank') conditions.push(isNull(col));
    }
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalRows = await db.select({ total: count() }).from(table).where(where);
  const total = Number(totalRows[0]?.total ?? 0);

  // Summaries scope to the whole filtered set, so they run against `where` without
  // the page limit. One extra round trip, only when a column asks for an aggregate.
  const summarized = config.columns.filter((c) => c.summarize && columns[c.name]);
  let summaries: Record<string, number> | undefined;
  if (summarized.length) {
    const selection: Record<string, SQL<unknown>> = {};
    for (const col of summarized) {
      const column = columns[col.name]!;
      if (col.summarize === 'sum') selection[col.name] = sum(column).mapWith(Number);
      else if (col.summarize === 'avg') selection[col.name] = avg(column).mapWith(Number);
      else if (col.summarize === 'min') selection[col.name] = min(column).mapWith(Number);
      else if (col.summarize === 'max') selection[col.name] = max(column).mapWith(Number);
      else selection[col.name] = count(column).mapWith(Number);
    }
    const [row] = await db.select(selection).from(table).where(where);
    summaries = Object.fromEntries(
      summarized.map((col) => [col.name, Number((row as Record<string, unknown>)?.[col.name] ?? 0)]),
    );
  }

  const sortCol = params.sort ? columns[params.sort] : undefined;
  const orderBy = sortCol ? (params.dir === 'desc' ? desc(sortCol) : asc(sortCol)) : undefined;

  const offset = (params.page - 1) * params.pageSize;

  // A dot-path column reads through a relation, so the row has to come from the
  // relational query API instead of a flat select. Only one level deep for now
  // ("author.name"), which is all the column resolver needs.
  const withClause: Record<string, { columns: Record<string, true> }> = {};
  for (const col of config.columns) {
    const [relation, field] = col.name.split('.');
    if (!relation || !field) continue;
    const entry = (withClause[relation] ??= { columns: {} });
    entry.columns[field] = true;
  }

  if (Object.keys(withClause).length) {
    const schemaKey = Object.keys(schema).find(
      (key) => (schema as Record<string, unknown>)[key] === table,
    );
    if (!schemaKey) throw new Error('Table is not exported from db/schema, cannot load relations');
    const relationalQuery = (
      db.query as unknown as Record<string, { findMany: (config: unknown) => Promise<Row[]> }>
    )[schemaKey]!;
    const rows = await relationalQuery.findMany({
      with: withClause,
      where,
      orderBy,
      limit: params.pageSize,
      offset,
    });
    return summaries ? { rows, total, summaries } : { rows, total };
  }

  const query = db.select().from(table).where(where).$dynamic();
  if (orderBy) query.orderBy(orderBy);
  const rows = await query.limit(params.pageSize).offset(offset);

  return summaries ? { rows, total, summaries } : { rows, total };
}
