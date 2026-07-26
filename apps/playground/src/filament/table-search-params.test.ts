import { describe, it, expect } from 'vitest';
import { parseSearch, searchToTableParams } from './table-search-params.js';

describe('parseSearch', () => {
  // Regression: the router coerces "true"/"false" to booleans, and keeping only values
  // that were already strings dropped every ternary filter silently.
  it('keeps a ternary filter the router parsed into a boolean', () => {
    expect(parseSearch({ page: 1, filter_published: true }).filter_published).toBe('true');
    expect(parseSearch({ page: 1, filter_published: false }).filter_published).toBe('false');
  });

  it('keeps a filter the router parsed into a number', () => {
    expect(parseSearch({ page: 1, filter_rating: 5 }).filter_rating).toBe('5');
  });

  it('keeps string filters and column searches', () => {
    const parsed = parseSearch({ page: 1, filter_status: 'draft', col_title: 'alpha' });
    expect(parsed.filter_status).toBe('draft');
    expect(parsed.col_title).toBe('alpha');
  });

  it('drops empty and missing values rather than filtering on them', () => {
    const parsed = parseSearch({ page: 1, filter_status: '', col_title: undefined });
    expect(parsed.filter_status).toBeUndefined();
    expect(parsed.col_title).toBeUndefined();
  });

  it('ignores keys that are not filters or column searches', () => {
    expect(parseSearch({ page: 1, nefarious: 'x' }).nefarious).toBeUndefined();
  });

  it('defaults paging and normalizes rubbish', () => {
    expect(parseSearch({})).toMatchObject({ page: 1, perPage: 10 });
    expect(parseSearch({ page: -3, perPage: 0 })).toMatchObject({ page: 1, perPage: 10 });
    expect(parseSearch({ page: 2, perPage: 25 })).toMatchObject({ page: 2, perPage: 25 });
  });

  it('only accepts a known sort direction', () => {
    expect(parseSearch({ page: 1, dir: 'desc' }).dir).toBe('desc');
    expect(parseSearch({ page: 1, dir: 'sideways' }).dir).toBeUndefined();
  });
});

describe('searchToTableParams', () => {
  it('splits prefixed keys into filters and column searches', () => {
    const params = searchToTableParams(
      parseSearch({ page: 2, perPage: 25, filter_published: true, col_title: 'alpha', search: 'x' }),
    );
    expect(params.filters).toEqual({ published: 'true' });
    expect(params.columnSearches).toEqual({ title: 'alpha' });
    expect(params).toMatchObject({ page: 2, pageSize: 25, search: 'x' });
  });

  it('passes no filters when none are set', () => {
    const params = searchToTableParams(parseSearch({ page: 1 }));
    expect(params.filters).toEqual({});
    expect(params.columnSearches).toEqual({});
  });
});
