import type { FieldNode, Prop, SchemaNode } from '@filamentjs/core';

export type ValidationRuleName =
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'unique';

export interface ValidationRule {
  name: ValidationRuleName;
  value?: number;
}

export interface FormFieldNode extends FieldNode {
  default?: unknown;
  placeholder?: Prop<string>;
  helperText?: Prop<string>;
  rules: ValidationRule[];
  options?: Record<string, string>;
  relation?: {
    model: unknown;
    labelColumn: string;
    valueColumn: string;
  };
  live?: boolean;
}

export interface LayoutNode extends SchemaNode {
  heading?: string;
  columns?: number;
}
