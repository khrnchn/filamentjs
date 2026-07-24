import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import {
  buildSchema,
  hydrate,
  dehydrate,
  resolveSchema,
  compileValidation,
  type ResolvedNode,
} from '@filamentjs/forms';
import { db } from '~/db/client';
import { posts } from '~/db/schema';
import { postsForm } from '~/filament/resources/posts';

export type FormCell = string | number | boolean | null;

export interface FormResponse {
  spec: ResolvedNode[];
  values: Record<string, FormCell>;
}

export interface SaveResult {
  ok: boolean;
  id?: string;
  errors?: Record<string, string>;
}

export const getPostForm = createServerFn({ method: 'GET' })
  .validator((id?: string) => id)
  .handler(async ({ data: id }): Promise<FormResponse> => {
    const schema = buildSchema(postsForm);
    let record: Record<string, unknown> | undefined;
    if (id) {
      const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      record = rows[0];
    }
    const values = hydrate(schema, record) as Record<string, FormCell>;
    const spec = resolveSchema(schema, values);
    return { spec, values };
  });

export const savePost = createServerFn({ method: 'POST' })
  .validator((input: { id?: string; values: Record<string, FormCell> }) => input)
  .handler(async ({ data }): Promise<SaveResult> => {
    const schema = buildSchema(postsForm);
    const result = compileValidation(schema).safeParse(dehydrate(schema, data.values));

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errors[String(i.path[0])] = i.message;
      });
      return { ok: false, errors };
    }

    const record = {
      title: String(data.values.title ?? ''),
      slug: String(data.values.slug ?? ''),
      body: data.values.body == null ? null : String(data.values.body),
      status: data.values.status == null ? 'draft' : String(data.values.status),
      published: Boolean(data.values.published),
    };

    if (data.id) {
      await db.update(posts).set(record).where(eq(posts.id, data.id));
      return { ok: true, id: data.id };
    }

    const inserted = await db.insert(posts).values(record).returning({ id: posts.id });
    return { ok: true, id: inserted[0]!.id };
  });
