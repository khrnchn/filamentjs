import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getPostForm, savePost } from '~/server/posts-form';
import { FormRenderer } from '~/filament/form-renderer';

export const Route = createFileRoute('/admin/posts_/new')({
  loader: () => getPostForm(),
  component: NewPost,
});

function NewPost() {
  const { spec, values } = Route.useLoaderData();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (next: Record<string, unknown>) => {
    const result = await savePost({ data: { values: next as Record<string, string | number | boolean | null> } });
    if (result.ok) {
      navigate({ to: '/admin/posts', search: { page: 1 } });
    } else {
      setErrors(result.errors ?? {});
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New post</h1>
        <Link to="/admin/posts" search={{ page: 1 }} className="text-sm hover:underline">
          Back to posts
        </Link>
      </div>
      <FormRenderer spec={spec} initialValues={values} errors={errors} onSubmit={onSubmit} />
    </div>
  );
}
