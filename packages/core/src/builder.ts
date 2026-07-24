import type { Prop, SchemaNode } from './types.js';

export class NodeBuilder<N extends SchemaNode> {
  protected node: SchemaNode;

  constructor(type: string) {
    this.node = { type };
  }

  visible(p: Prop<boolean>): this {
    this.node.visible = p;
    return this;
  }

  disabled(p: Prop<boolean>): this {
    this.node.disabled = p;
    return this;
  }

  columnSpan(p: Prop<number>): this {
    this.node.columnSpan = p;
    return this;
  }

  build(): N {
    return this.node as N;
  }
}
