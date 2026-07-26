import { describe, it, expect } from 'vitest';
import { f } from './factory.js';
import { buildSchema } from './schema.js';
import { compileValidation } from './validation.js';

describe('compileValidation', () => {
  it('rejects a missing required string', () => {
    const schema = compileValidation(buildSchema([f.text('name').required()]));
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ name: 'Ada' }).success).toBe(true);
  });
  it('allows an omitted optional field', () => {
    const schema = compileValidation(buildSchema([f.text('bio')]));
    expect(schema.safeParse({}).success).toBe(true);
  });
  it('enforces email format', () => {
    const schema = compileValidation(buildSchema([f.text('email').required().email()]));
    expect(schema.safeParse({ email: 'nope' }).success).toBe(false);
    expect(schema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
  it('enforces maxLength', () => {
    const schema = compileValidation(buildSchema([f.text('name').required().maxLength(3)]));
    expect(schema.safeParse({ name: 'abcd' }).success).toBe(false);
    expect(schema.safeParse({ name: 'abc' }).success).toBe(true);
  });
  it('validates dotted fields through a nested object with nested error paths', () => {
    const schema = compileValidation(
      buildSchema([f.text('meta.author').required().minLength(3)]),
    );
    expect(schema.safeParse({ meta: { author: 'Ada' } }).success).toBe(true);

    const result = schema.safeParse({ meta: { author: 'Al' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['meta', 'author']);
    }
  });
  it('allows an omitted optional dotted field', () => {
    const schema = compileValidation(buildSchema([f.text('meta.author')]));
    expect(schema.safeParse({}).success).toBe(true);
  });
  it('types toggles as boolean', () => {
    const schema = compileValidation(buildSchema([f.toggle('active').required()]));
    expect(schema.safeParse({ active: 'yes' }).success).toBe(false);
    expect(schema.safeParse({ active: true }).success).toBe(true);
  });
  it('rejects an empty array for a required multiSelect', () => {
    const schema = compileValidation(buildSchema([f.multiSelect('tags').required()]));
    expect(schema.safeParse({ tags: [] }).success).toBe(false);
    expect(schema.safeParse({ tags: ['a'] }).success).toBe(true);
  });
  it('validates a required relationSelect as one non-empty string', () => {
    const schema = compileValidation(
      buildSchema([f.relationSelect('authorId').relatedTo({}, { label: 'name' }).required()]),
    );
    expect(schema.safeParse({ authorId: '' }).success).toBe(false);
    expect(schema.safeParse({ authorId: ['user-1'] }).success).toBe(false);
    expect(schema.safeParse({ authorId: 'user-1' }).success).toBe(true);
  });
  it('ignores the unique rule at compile time', () => {
    const schema = compileValidation(buildSchema([f.text('email').required().unique()]));
    expect(schema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
});
