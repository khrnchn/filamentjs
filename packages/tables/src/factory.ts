import { BadgeColumnBuilder, ColumnBuilder } from './columns.js';
import { FilterBuilder } from './filters.js';
import { ActionBuilder } from './actions.js';
import type { EmptyState, TableConfig } from './types.js';

export const t = {
  text: (name: string) => new ColumnBuilder('text', name),
  badge: (name: string) => new BadgeColumnBuilder('badge', name),
  boolean: (name: string) => new ColumnBuilder('boolean', name),
  icon: (name: string) => new ColumnBuilder('icon', name),
  image: (name: string) => new ColumnBuilder('image', name),
  select: (name: string) => new FilterBuilder('select', name),
  ternary: (name: string) => new FilterBuilder('ternary', name),
  viewAction: () => new ActionBuilder({ type: 'view', name: 'view' }),
  editAction: () => new ActionBuilder({ type: 'edit', name: 'edit' }),
  deleteAction: () =>
    new ActionBuilder({ type: 'delete', name: 'delete', requiresConfirmation: true, destructive: true }),
  createAction: () => new ActionBuilder({ type: 'create', name: 'create' }),
  deleteBulkAction: () => new ActionBuilder({ type: 'deleteBulk', name: 'deleteBulk', destructive: true }),
};

export interface TableConfigInput {
  columns: ColumnBuilder[];
  filters?: FilterBuilder[];
  actions?: ActionBuilder[];
  bulkActions?: ActionBuilder[];
  headerActions?: ActionBuilder[];
  pageSizes?: number[];
  emptyState?: EmptyState;
}

export function buildTable(input: TableConfigInput): TableConfig {
  const config: TableConfig = {
    columns: input.columns.map((c) => c.build()),
    filters: (input.filters ?? []).map((f) => f.build()),
    actions: (input.actions ?? []).map((a) => a.build()),
    bulkActions: (input.bulkActions ?? []).map((a) => a.build()),
    headerActions: (input.headerActions ?? []).map((a) => a.build()),
    pageSizes: input.pageSizes ?? [10, 25, 50, 100],
  };
  if (input.emptyState) config.emptyState = input.emptyState;
  return config;
}
