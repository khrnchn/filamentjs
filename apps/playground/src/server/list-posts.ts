import { createServerFn } from '@tanstack/react-start';
import { resolveTableSpec, type TableParams, type TableSpec } from '@filamentjs/tables';
import { resolveQuery } from './resolve-query.js';
import { postsModel, postsTableConfig } from '~/filament/resources/posts';

type Cell = string | number | boolean | null | Date;

export interface ListResponse {
  rows: Record<string, Cell>[];
  total: number;
  spec: TableSpec;
}

export const listPosts = createServerFn({ method: 'GET' })
  .validator((params: TableParams) => params)
  .handler(async ({ data }): Promise<ListResponse> => {
    const result = await resolveQuery(postsModel, postsTableConfig, data);
    return {
      rows: result.rows as Record<string, Cell>[],
      total: result.total,
      spec: resolveTableSpec(postsTableConfig),
    };
  });
