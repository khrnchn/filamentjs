import { and, or, asc, desc, count, ilike, eq, inArray, isNull, getTableColumns } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { TableConfig, TableParams, TableResult } from '@filamentjs/tables';
import { db } from '../db/client.js';

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

  const sortCol = params.sort ? columns[params.sort] : undefined;
  const orderBy = sortCol ? (params.dir === 'desc' ? desc(sortCol) : asc(sortCol)) : undefined;

  const query = db.select().from(table).where(where).$dynamic();
  if (orderBy) query.orderBy(orderBy);
  const rows = await query.limit(params.pageSize).offset((params.page - 1) * params.pageSize);

  return { rows, total };
}
