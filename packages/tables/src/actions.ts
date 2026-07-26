import type { ActionNode } from './types.js';

export class ActionBuilder {
  protected node: ActionNode;

  constructor(node: ActionNode) {
    this.node = node;
  }

  label(l: string): this {
    this.node.label = l;
    return this;
  }

  icon(i: string): this {
    this.node.icon = i;
    return this;
  }

  requiresConfirmation(): this {
    this.node.requiresConfirmation = true;
    return this;
  }

  destructive(): this {
    this.node.destructive = true;
    return this;
  }

  build(): ActionNode {
    return this.node;
  }
}
