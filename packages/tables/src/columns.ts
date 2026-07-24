import type { ColumnNode, ColumnType, Row } from './types.js';

export class ColumnBuilder {
  protected node: ColumnNode;

  constructor(type: ColumnType, name: string) {
    this.node = { type, name };
  }

  label(l: string): this {
    this.node.label = l;
    return this;
  }

  sortable(): this {
    this.node.sortable = true;
    return this;
  }

  searchable(): this {
    this.node.searchable = true;
    return this;
  }

  accessor(fn: (row: Row) => unknown): this {
    this.node.accessor = fn;
    return this;
  }

  build(): ColumnNode {
    return this.node;
  }
}

export class BadgeColumnBuilder extends ColumnBuilder {
  colors(map: Record<string, string>): this {
    this.node.colors = map;
    return this;
  }
}
