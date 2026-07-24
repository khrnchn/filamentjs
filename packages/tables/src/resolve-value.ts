import { getPath } from '@filamentjs/core';
import type { ColumnNode, Row } from './types.js';

export function resolveColumnValue(row: Row, column: ColumnNode): unknown {
  if (column.accessor) return column.accessor(row);
  return getPath(row, column.name);
}

export function humanizeLabel(name: string): string {
  const last = name.split('.').pop() ?? name;
  return last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
