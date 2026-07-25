import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getResourceForm, saveResource, type FormCell } from '~/server/resource-fns';
import { FormRenderer } from '~/filament/form-renderer';

export const Route = createFileRoute('/admin/$resource_/$id/edit')({
  loader: ({ params }) => getResourceForm({ data: { slug: params.resource, id: params.id } }),
  component: EditRecord,
});

function EditRecord() {
  const { resource, id } = Route.useParams();
  const { spec, values } = Route.useLoaderData();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (next: Record<string, unknown>) => {
    const result = await saveResource({
      data: { slug: resource, id, values: next as Record<string, FormCell> },
    });
    if (result.ok) {
      navigate({ to: '/admin/$resource', params: { resource }, search: { page: 1 } });
    } else {
      setErrors(result.errors ?? {});
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit</h1>
        <Link to="/admin/$resource" params={{ resource }} search={{ page: 1 }} className="text-sm hover:underline">
          Back
        </Link>
      </div>
      <FormRenderer spec={spec} initialValues={values} errors={errors} onSubmit={onSubmit} />
    </div>
  );
}
