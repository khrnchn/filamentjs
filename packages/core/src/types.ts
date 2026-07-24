export interface Ctx {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  record?: Record<string, unknown>;
  values: Record<string, unknown>;
}

export type Prop<T> = T | ((ctx: Ctx) => T);

export interface SchemaNode {
  type: string;
  key?: string;
  children?: SchemaNode[];
  visible?: Prop<boolean>;
  disabled?: Prop<boolean>;
  columnSpan?: Prop<number>;
}

export interface FieldNode extends SchemaNode {
  name: string;
  label?: Prop<string>;
}
