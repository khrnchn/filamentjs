import type { Aggregate, ColumnNode, ColumnType, Row } from './types.js';

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

  toggleable(opts: { hiddenByDefault?: boolean } = {}): this {
    this.node.toggleable = true;
    this.node.hiddenByDefault = opts.hiddenByDefault ?? false;
    return this;
  }

  summarize(aggregate: Aggregate): this {
    this.node.summarize = aggregate;
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
