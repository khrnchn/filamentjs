import { humanizeLabel } from './resolve-value.js';
import type { ActionNode, ColumnNode, FilterNode, TableConfig } from './types.js';

export interface ColumnSpec {
  type: string;
  name: string;
  label: string;
  sortable: boolean;
  searchable: boolean;
  colors?: Record<string, string>;
}

export interface FilterSpec {
  type: string;
  name: string;
  label: string;
  options?: Record<string, string>;
  multiple?: boolean;
}

export interface TableSpec {
  columns: ColumnSpec[];
  filters: FilterSpec[];
  actions: ActionNode[];
  bulkActions: ActionNode[];
  headerActions: ActionNode[];
}

function columnSpec(col: ColumnNode): ColumnSpec {
  const spec: ColumnSpec = {
    type: col.type,
    name: col.name,
    label: col.label ?? humanizeLabel(col.name),
    sortable: col.sortable ?? false,
    searchable: col.searchable ?? false,
  };
  if (col.colors) spec.colors = col.colors;
  return spec;
}

function filterSpec(filter: FilterNode): FilterSpec {
  const spec: FilterSpec = {
    type: filter.type,
    name: filter.name,
    label: filter.label ?? humanizeLabel(filter.name),
  };
  if (filter.options) spec.options = filter.options;
  if (filter.multiple) spec.multiple = true;
  return spec;
}

export function resolveTableSpec(config: TableConfig): TableSpec {
  return {
    columns: config.columns.map(columnSpec),
    filters: config.filters.map(filterSpec),
    actions: config.actions,
    bulkActions: config.bulkActions,
    headerActions: config.headerActions,
  };
}
