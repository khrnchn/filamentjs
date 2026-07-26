import { NodeBuilder } from '@filamentjs/core';
import type { Prop, SchemaNode } from '@filamentjs/core';
import type { InfolistEntryNode, InfolistLayoutNode } from './types.js';

export type AnyBuilder = NodeBuilder<SchemaNode>;

export class EntryBuilder extends NodeBuilder<InfolistEntryNode> {
  protected declare node: InfolistEntryNode;

  constructor(type: string, name: string) {
    super(type);
    this.node.name = name;
  }

  label(l: Prop<string>): this {
    this.node.label = l;
    return this;
  }

  placeholder(p: string): this {
    this.node.placeholder = p;
    return this;
  }
}

export class BadgeEntryBuilder extends EntryBuilder {
  colors(map: Record<string, string>): this {
    this.node.colors = map;
    return this;
  }
}

export class LayoutEntryBuilder extends NodeBuilder<InfolistLayoutNode> {
  protected declare node: InfolistLayoutNode;
  private childBuilders: AnyBuilder[];

  constructor(type: string, children: AnyBuilder[]) {
    super(type);
    this.childBuilders = children;
  }

  build(): InfolistLayoutNode {
    return { ...this.node, children: this.childBuilders.map((c) => c.build()) };
  }
}

export class SectionBuilder extends LayoutEntryBuilder {
  constructor(heading: string, children: AnyBuilder[]) {
    super('section', children);
    this.node.heading = heading;
  }
}

export class GridBuilder extends LayoutEntryBuilder {
  constructor(columns: number, children: AnyBuilder[]) {
    super('grid', children);
    this.node.columns = columns;
  }
}
