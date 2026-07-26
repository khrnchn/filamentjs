export const DEFAULT_PAGE_SIZE = 10;

export type ResourceSearch = {
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page: number;
  perPage?: number;
  hidden?: string;
} & Record<string, string | number | undefined>;

// The router parses "true" and "1" out of the query string into a boolean or a number,
// so filter and column-search values are normalized back to strings. Keeping only values
// that arrive as strings silently drops every ternary filter.
export function parseSearch(search: Record<string, unknown>): ResourceSearch {
  const parsed: ResourceSearch = {
    search: typeof search.search === 'string' && search.search ? search.search : undefined,
    sort: typeof search.sort === 'string' && search.sort ? search.sort : undefined,
    dir: search.dir === 'desc' ? 'desc' : search.dir === 'asc' ? 'asc' : undefined,
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    perPage: Number(search.perPage) > 0 ? Number(search.perPage) : DEFAULT_PAGE_SIZE,
    hidden: typeof search.hidden === 'string' && search.hidden ? search.hidden : undefined,
  };

  for (const [key, value] of Object.entries(search)) {
    if (!key.startsWith('filter_') && !key.startsWith('col_')) continue;
    if (value === undefined || value === null || value === '') continue;
    parsed[key] = String(value);
  }

  return parsed;
}

export function searchToTableParams(deps: ResourceSearch) {
  const filters: Record<string, unknown> = Object.create(null);
  const columnSearches: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(deps)) {
    if (value === undefined) continue;
    if (key.startsWith('filter_')) filters[key.slice('filter_'.length)] = String(value);
    if (key.startsWith('col_')) columnSearches[key.slice('col_'.length)] = String(value);
  }

  return {
    search: deps.search,
    sort: deps.sort,
    dir: deps.dir,
    filters,
    columnSearches,
    page: deps.page,
    pageSize: deps.perPage ?? DEFAULT_PAGE_SIZE,
  };
}
