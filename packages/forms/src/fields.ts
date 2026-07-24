import { NodeBuilder } from '@filamentjs/core';
import type { Prop } from '@filamentjs/core';
import type { FormFieldNode } from './types.js';

export class FieldBuilder<N extends FormFieldNode = FormFieldNode> extends NodeBuilder<N> {
  protected declare node: FormFieldNode;

  constructor(type: string, name: string) {
    super(type);
    this.node.name = name;
    this.node.rules = [];
  }

  label(l: Prop<string>): this {
    this.node.label = l;
    return this;
  }

  default(v: unknown): this {
    this.node.default = v;
    return this;
  }

  placeholder(p: Prop<string>): this {
    this.node.placeholder = p;
    return this;
  }

  helperText(h: Prop<string>): this {
    this.node.helperText = h;
    return this;
  }

  required(): this {
    this.node.rules.push({ name: 'required' });
    return this;
  }

  live(): this {
    this.node.live = true;
    return this;
  }
}

export class TextFieldBuilder extends FieldBuilder {
  email(): this {
    this.node.rules.push({ name: 'email' });
    return this;
  }

  minLength(n: number): this {
    this.node.rules.push({ name: 'minLength', value: n });
    return this;
  }

  maxLength(n: number): this {
    this.node.rules.push({ name: 'maxLength', value: n });
    return this;
  }

  unique(): this {
    this.node.rules.push({ name: 'unique' });
    return this;
  }
}

export class SelectFieldBuilder extends FieldBuilder {
  options(opts: Record<string, string>): this {
    this.node.options = opts;
    return this;
  }
}
