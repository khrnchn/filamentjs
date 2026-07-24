import type { FilterNode, FilterType } from './types.js';

export class FilterBuilder {
  protected node: FilterNode;

  constructor(type: FilterType, name: string) {
    this.node = { type, name };
  }

  label(l: string): this {
    this.node.label = l;
    return this;
  }

  options(opts: Record<string, string>): this {
    this.node.options = opts;
    return this;
  }

  multiple(): this {
    this.node.multiple = true;
    return this;
  }

  build(): FilterNode {
    return this.node;
  }
}
