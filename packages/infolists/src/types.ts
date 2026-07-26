import type { Prop, SchemaNode } from '@filamentjs/core';

export interface InfolistEntryNode extends SchemaNode {
  name?: string;
  label?: Prop<string>;
  placeholder?: string; // shown when the value is null or empty
  format?: 'text' | 'badge' | 'boolean' | 'date' | 'dateTime' | 'image' | 'code';
  colors?: Record<string, string>;
  children?: InfolistEntryNode[];
}

export interface InfolistLayoutNode extends SchemaNode {
  heading?: string;
  columns?: number;
}

export interface ResolvedEntry {
  type: string;
  name?: string;
  label?: string;
  value: string | number | boolean | null;
  visible: boolean;
  heading?: string;
  columns?: number;
  colors?: Record<string, string>;
  children?: ResolvedEntry[];
}
