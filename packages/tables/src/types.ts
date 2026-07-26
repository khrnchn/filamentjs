export type Row = Record<string, unknown>;

export type ColumnType = 'text' | 'badge' | 'boolean' | 'icon' | 'image';

export type Aggregate = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface ColumnNode {
  type: ColumnType;
  name: string;
  label?: string;
  sortable?: boolean;
  searchable?: boolean;
  toggleable?: boolean;
  hiddenByDefault?: boolean;
  summarize?: Aggregate;
  accessor?: (row: Row) => unknown;
  colors?: Record<string, string>;
}

export interface EmptyState {
  heading: string;
  description?: string;
  icon?: string;
}

export type FilterType = 'select' | 'ternary';

export interface FilterNode {
  type: FilterType;
  name: string;
  label?: string;
  options?: Record<string, string>;
  multiple?: boolean;
}

export type ActionType = 'view' | 'edit' | 'delete' | 'create' | 'deleteBulk' | 'custom';

export interface ActionNode {
  type: ActionType;
  name: string;
  label?: string;
  icon?: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
}

export interface TableConfig {
  columns: ColumnNode[];
  filters: FilterNode[];
  actions: ActionNode[];
  bulkActions: ActionNode[];
  headerActions: ActionNode[];
  pageSizes: number[];
  emptyState?: EmptyState;
}

export interface TableParams {
  sort?: string;
  dir?: 'asc' | 'desc';
  search?: string;
  columnSearches?: Record<string, string>;
  filters?: Record<string, unknown>;
  page: number;
  pageSize: number;
}

export interface TableResult<R = Row> {
  rows: R[];
  total: number;
  // aggregates over the whole filtered set, keyed by column name, not just this page
  summaries?: Record<string, number>;
}
