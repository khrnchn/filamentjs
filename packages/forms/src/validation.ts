import { z } from 'zod';
import { setPath, type SchemaNode } from '@filamentjs/core';
import { collectFields } from './schema.js';
import type { FormFieldNode } from './types.js';

const ARRAY_TYPES = new Set(['multiSelect', 'checkboxList']);
const BOOLEAN_TYPES = new Set(['checkbox', 'toggle']);

export function compileField(field: FormFieldNode): z.ZodTypeAny {
  const required = field.rules.some((r) => r.name === 'required');

  let schema: z.ZodTypeAny;
  if (BOOLEAN_TYPES.has(field.type)) {
    schema = z.boolean();
  } else if (ARRAY_TYPES.has(field.type)) {
    // an empty selection is not a selection
    schema = required ? z.array(z.string()).min(1) : z.array(z.string());
  } else {
    let str = z.string();
    for (const rule of field.rules) {
      if (rule.name === 'email') str = str.email();
      if (rule.name === 'minLength' && rule.value !== undefined) str = str.min(rule.value);
      if (rule.name === 'maxLength' && rule.value !== undefined) str = str.max(rule.value);
    }
    // required strings must be non-empty
    if (required) str = str.min(1);
    schema = str;
  }

  return required ? schema : schema.optional();
}

export function compileValidation(nodes: SchemaNode[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const fields: Record<string, unknown> = {};
  for (const field of collectFields(nodes)) {
    setPath(fields, field.name, compileField(field));
  }

  const compileObject = (
    values: Record<string, unknown>,
  ): Record<string, z.ZodTypeAny> =>
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => {
        if (value instanceof z.ZodType) return [name, value];

        const shape = compileObject(value as Record<string, unknown>);
        const object = z.object(shape);
        return [
          name,
          Object.values(shape).every((schema) => schema.isOptional())
            ? object.optional()
            : object,
        ];
      }),
    );

  return z.object(compileObject(fields));
}
