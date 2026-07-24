import { NodeBuilder } from '@filamentjs/core';
import type { SchemaNode } from '@filamentjs/core';
import type { LayoutNode } from './types.js';

export type AnyBuilder = NodeBuilder<SchemaNode>;

export class LayoutBuilder extends NodeBuilder<LayoutNode> {
  protected declare node: LayoutNode;
  private childBuilders: AnyBuilder[];

  constructor(type: string, children: AnyBuilder[]) {
    super(type);
    this.childBuilders = children;
  }

  build(): LayoutNode {
    return { ...this.node, children: this.childBuilders.map((c) => c.build()) };
  }
}

export class SectionBuilder extends LayoutBuilder {
  constructor(heading: string, children: AnyBuilder[]) {
    super('section', children);
    this.node.heading = heading;
  }
}

export class GridBuilder extends LayoutBuilder {
  constructor(columns: number, children: AnyBuilder[]) {
    super('grid', children);
    this.node.columns = columns;
  }
}
